/**
 * Captures the app screens shown on the website's 3D phone.
 *
 * Runs the web build in headless Chrome (over the DevTools protocol, so no
 * extra packages), seeded with a realistic day of meals and a fixed early
 * afternoon clock, and writes JPEGs to website/public/screens/.
 *
 * Needs the app's web dev server running (`npm run web -- --port 8086`).
 *   BASE_URL  app address (default http://localhost:8086)
 *   CHROME    Chrome binary (default: the macOS install)
 *   ONLY      comma-separated shot names to capture (default: all)
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8086';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'website', 'public', 'screens');
const PORT = 9333;
const ACCENT = 'rgb(212, 242, 92)';

// Today at 13:40, so the greeting, "Up next" and today's meals read naturally.
const clock = new Date();
clock.setHours(13, 40, 0, 0);
const at = (hours, minutes) => new Date(clock).setHours(hours, minutes, 0, 0);

const STORAGE = {
  'foodhabits/language': 'en',
  'foodhabits/onboarded': true,
  'foodhabits/voice': false,
  'foodhabits/scans': [
    { id: 'lunch', createdAt: at(13, 15), food: { kind: 'label', index: 409 }, photo: null, source: 'search' },
    { id: 'breakfast', createdAt: at(8, 40), food: { kind: 'catalog', name: 'Masala dosa' }, photo: null, source: 'search' },
  ],
};

const SHOTS = [
  { name: 'home', path: '/' },
  { name: 'camera', path: '/scan?demo=1' },
  { name: 'result', path: '/result/lunch' },
  { name: 'next', path: '/result/lunch', scrollTo: 'Avoid next' },
  // The explainer video's take-apart scene, with a part under the spotlight.
  { name: 'explainer', path: '/explainer/lunch', wait: 17000 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Not listening yet.
    }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const waiters = [];
  let nextId = 1;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      waiters.filter((waiter) => waiter.method === message.method).forEach((waiter) => waiter.resolve(message.params));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }));
  return new Promise((resolve) => socket.addEventListener('open', () => resolve({ send, once, close: () => socket.close() })));
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function waitFor(cdp, expression, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(cdp, expression)) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'foodhabits-capture-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--mute-audio',
    'about:blank',
  ]);
  try {
    const cdp = await connect(await waitForChrome());
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const offset = ${clock.getTime()} - Date.now();
        const RealDate = Date;
        class FixedDate extends RealDate {
          constructor(...args) { args.length ? super(...args) : super(RealDate.now() + offset); }
          static now() { return RealDate.now() + offset; }
        }
        globalThis.Date = FixedDate;
      })();`,
    });

    let loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/privacy` });
    await loaded;
    await evaluate(
      cdp,
      `(() => { localStorage.clear(); for (const [key, value] of Object.entries(${JSON.stringify(STORAGE)})) localStorage.setItem(key, JSON.stringify(value)); })()`,
    );

    const only = process.env.ONLY?.split(',');
    for (const shot of SHOTS.filter((item) => !only || only.includes(item.name))) {
      loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', { url: `${BASE_URL}${shot.path}` });
      await loaded;
      // Fonts, the first WebGL frames and entering animations.
      await waitFor(cdp, `document.fonts.status === 'loaded' && document.body.innerText.length > 20`);
      await sleep(3500);
      if (shot.scrollTo) {
        await evaluate(
          cdp,
          `(() => {
            const heading = [...document.querySelectorAll('body *')].filter((node) => node.textContent.trim() === ${JSON.stringify(shot.scrollTo)}).pop();
            heading.scrollIntoView({ block: 'start' });
            let scroller = heading.parentElement;
            while (scroller && scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement;
            scroller?.scrollBy(0, -36);
          })()`,
        );
        await sleep(800);
      }
      if (shot.wait) await sleep(shot.wait);
      if (shot.sceneReached) {
        // Explainer progress segments light up as scenes play.
        await waitFor(
          cdp,
          `[...document.querySelectorAll('div')].filter((node) => getComputedStyle(node).backgroundColor === '${ACCENT}' && node.offsetHeight <= 6 && node.offsetWidth > 20).length >= ${shot.sceneReached}`,
          60000,
        );
        await sleep(shot.after ?? 2200);
      }
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
      writeFileSync(join(OUT, `${shot.name}.jpg`), Buffer.from(data, 'base64'));
      console.log(`Saved ${shot.name}.jpg`);
    }
    cdp.close();
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
