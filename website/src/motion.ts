import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { LITE } from './quality';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** When the preloader lifted, in seconds of performance.now(), so the hero's 3D intro starts on cue. */
export const reveal = { at: Number.POSITIVE_INFINITY };

/** Seconds since the page was revealed (0 until then). */
export function sinceReveal() {
  return Math.max(0, performance.now() / 1000 - reveal.at);
}

/**
 * Draws the Kolam f inside `root` on the brand timeline (1.8 s), holds, then
 * lifts the preloader and calls `onDone`: seeds pop in row by row, the f line
 * draws, the pod draws, its seeds pulse once and the wordmark rises in.
 */
export function playMarkDrawing(root: HTMLElement, onDone: () => void) {
  const seeds = root.querySelectorAll<SVGCircleElement>('.mark__seed');
  const f = root.querySelector<SVGPathElement>('.mark__f');
  const pod = root.querySelector<SVGPathElement>('.mark__pod');
  const name = root.querySelector<HTMLElement>('.preloader__name');
  const finish = () => {
    reveal.at = performance.now() / 1000;
    onDone();
  };
  if (reducedMotion) {
    const timer = window.setTimeout(() => {
      gsap.to(root, { autoAlpha: 0, duration: 0.3, onComplete: finish });
    }, 500);
    return () => window.clearTimeout(timer);
  }
  const pageReady = new Promise<void>((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', () => resolve(), { once: true });
    window.setTimeout(resolve, 3500);
  });
  const timeline = gsap.timeline({ paused: true });
  // Round caps would leave a dot at 0, so the lines stay hidden until they start drawing.
  timeline.set([f, pod], { strokeDasharray: 100, strokeDashoffset: 100, opacity: 0 });
  timeline.set(seeds, { scale: 0, transformOrigin: '50% 50%', transformBox: 'fill-box' });
  timeline.set(name, { opacity: 0, y: 8 });
  timeline.to(seeds, { scale: 1, duration: 0.26, ease: 'back.out(2.2)', stagger: 0.07 }, 0);
  timeline.set(f, { opacity: 1 }, 0.38);
  timeline.to(f, { strokeDashoffset: 0, duration: 0.72, ease: 'power3.inOut' }, 0.38);
  timeline.set(pod, { opacity: 1 }, 0.9);
  timeline.to(pod, { strokeDashoffset: 0, duration: 0.6, ease: 'power3.inOut' }, 0.9);
  timeline.to([seeds[1], seeds[2], seeds[3]], { attr: { r: '+=0.9' }, duration: 0.125, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.45);
  timeline.to(name, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.3);
  timeline.to({}, { duration: 0.3 });
  let lift: gsap.core.Tween | undefined;
  timeline.eventCallback('onComplete', () => {
    pageReady.then(() => {
      // The curtain parts from the middle, like a projector's shutter opening on the first frame.
      lift = gsap.to(root, { clipPath: 'inset(50% 0 50% 0)', duration: 1.1, ease: 'expo.inOut', onComplete: finish });
    });
  });
  timeline.play();
  return () => {
    timeline.kill();
    lift?.kill();
  };
}

/**
 * Headings marked data-split come in like film titles. The hero
 * (data-split="reveal") pulls into focus letter by letter as the curtain
 * opens; every other heading is wiped on line by line, a block of its
 * chapter's key colour sweeping across and leaving the words behind.
 */
export function startSplitReveals() {
  if (reducedMotion) return { stop: () => {}, playHero: () => {} };
  const splits: SplitText[] = [];
  const triggers: ScrollTrigger[] = [];
  let hero: gsap.core.Timeline | undefined;
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((element) => {
    if (element.dataset.split === 'reveal') {
      const split = SplitText.create(element, { type: 'lines,chars', mask: 'lines', linesClass: 'split-line' });
      splits.push(split);
      // Phones skip the blur: a filter on every letter is costly while the 3D scene starts up.
      const blur = (radius: number) => (LITE ? {} : { filter: `blur(${radius}px)` });
      gsap.set(split.chars, { yPercent: 70, opacity: 0, ...blur(14) });
      hero = gsap
        .timeline({ paused: true })
        .to(split.chars, { yPercent: 0, opacity: 1, ...blur(0), duration: 1.2, ease: 'expo.out', stagger: 0.022, clearProps: 'filter' });
      return;
    }
    const split = SplitText.create(element, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    splits.push(split);
    const wipes = split.lines.map((line) => {
      const block = document.createElement('span');
      block.className = 'wipe';
      line.parentElement?.appendChild(block);
      return block;
    });
    gsap.set(split.lines, { opacity: 0 });
    gsap.set(wipes, { scaleX: 0, transformOrigin: 'left center' });
    const timeline = gsap.timeline({ paused: true });
    split.lines.forEach((line, index) => {
      const at = index * 0.14;
      timeline
        .to(wipes[index], { scaleX: 1, duration: 0.45, ease: 'expo.inOut' }, at)
        .set(line, { opacity: 1 }, at + 0.45)
        .set(wipes[index], { transformOrigin: 'right center' }, at + 0.45)
        .to(wipes[index], { scaleX: 0, duration: 0.55, ease: 'expo.inOut' }, at + 0.45)
        .set(wipes[index], { display: 'none' });
    });
    triggers.push(ScrollTrigger.create({ trigger: element, start: 'top 85%', once: true, onEnter: () => timeline.play() }));
  });
  return {
    stop: () => {
      triggers.forEach((trigger) => trigger.kill());
      splits.forEach((split) => split.revert());
      document.querySelectorAll('.wipe').forEach((block) => block.remove());
    },
    playHero: () => hero?.play(),
  };
}

/** Smooth, inertial scrolling kept in sync with ScrollTrigger. */
export function startSmoothScroll() {
  if (reducedMotion) return () => {};
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

/**
 * Elements marked data-reveal rise into place the first time they scroll into
 * view, staggered within their parent. Driven by IntersectionObserver and CSS,
 * so content can never get stuck hidden.
 */
export function startReveals() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (reducedMotion) return () => {};
  document.documentElement.classList.add('reveals');
  elements.forEach((element) => {
    const siblings = Array.from(element.parentElement?.querySelectorAll(':scope > [data-reveal]') ?? []);
    element.style.setProperty('--i', String(Math.max(0, siblings.indexOf(element))));
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  elements.forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}

/** Calls `update` with 0-1 progress as the element scrolls from its top to its bottom edge. */
export function trackProgress(element: HTMLElement, update: (progress: number) => void) {
  const trigger = ScrollTrigger.create({
    trigger: element,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => update(self.progress),
  });
  return () => trigger.kill();
}

/** Counts a number up when it scrolls into view, keeping any prefix or suffix. */
export function startCounters() {
  if (reducedMotion) return () => {};
  const elements = gsap.utils.toArray<HTMLElement>('[data-count]');
  const triggers = elements.map((element) => {
    const target = Number(element.dataset.count);
    const format = new Intl.NumberFormat('en');
    const state = { value: 0 };
    const suffix = element.dataset.suffix ?? '';
    element.textContent = `0${suffix}`;
    return ScrollTrigger.create({
      trigger: element,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          value: target,
          duration: 1.6,
          ease: 'expo.out',
          onUpdate: () => {
            element.textContent = `${format.format(Math.round(state.value))}${suffix}`;
          },
        }),
    });
  });
  return () => triggers.forEach((trigger) => trigger.kill());
}
