#!/usr/bin/env node
/**
 * Renders the foodhabits.com mark, the "Kolam f": one rice-flour line around
 * five seeds on a 3x3 grid, like a kolam drawn at an Indian doorstep. Writes
 * every icon and splash asset the app config points at, and the website's
 * favicons. Edit the SVG here, then run:
 *
 *   node scripts/generate-assets.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'assets', 'images');
const site = join(root, 'website', 'public');

const INK = '#07120D';
const RICE = '#EAF2EC';
const SEED = '#D4F25C';

const SEEDS = [
  [50, 32],
  [32, 50],
  [50, 50],
  [68, 50],
  [32, 68],
];

/** The line and seeds at a given weight; sizes from 48 px up use the master (or its heavier 48-64 px weight). */
function master({ stroke = 4, radius = 2.6, line = RICE, seed = SEED } = {}) {
  return `
    <g fill="none" stroke="${line}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M59 33V32A9 9 0 0 0 41 32V68A9 9 0 0 1 23 68V64"/>
      <path d="M16 50A62.8 62.8 0 0 1 84 50A50.96 50.96 0 0 1 16 50Z"/>
    </g>
    <g fill="${seed}">${SEEDS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${radius}"/>`).join('')}</g>`;
}

/** 24 to 47 px: opened-up curves, heavier line, two seeds. */
function smallCut() {
  return `
    <g fill="none" stroke="${RICE}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M62 32A10 10 0 0 0 42 32V69A10 10 0 0 1 22 69V67"/>
      <path d="M13 50A80 80 0 0 1 87 50A52 52 0 0 1 13 50Z"/>
    </g>
    <g fill="${SEED}"><circle cx="30" cy="52.5" r="3.4"/><circle cx="56" cy="52.5" r="3.4"/></g>`;
}

/** 23 px and below: the line alone. */
function tinyCut() {
  return `
    <g fill="none" stroke="${RICE}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M64 32A11 11 0 0 0 42 32V72A11 11 0 0 1 20 72" stroke-width="10"/>
      <path d="M10 53A90 90 0 0 1 90 53A56 56 0 0 1 10 53Z" stroke-width="8"/>
    </g>`;
}

const square = `<rect width="100" height="100" fill="${INK}"/>`;
const tile = `<rect width="100" height="100" rx="22" fill="${INK}"/>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

function render(path, source, width) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(path, png);
  console.log(`wrote ${path.replace(`${root}/`, '')} (${width}px)`);
}

// iOS and store icon: the master on ink, square corners (iOS applies its own mask).
const appIcon = svg(square + master());
render(join(app, 'icon.png'), appIcon, 1024);
render(join(site, 'icon.png'), appIcon, 1024);

// Android adaptive icon: the mark inside the 66 dp safe circle, over a solid ink layer.
const safe = (body) => `<g transform="translate(11 11) scale(0.78)">${body}</g>`;
render(join(app, 'android-icon-foreground.png'), svg(safe(master())), 1024);
render(join(app, 'android-icon-background.png'), svg(square), 1024);
render(join(app, 'android-icon-monochrome.png'), svg(safe(master({ line: '#FFFFFF', seed: '#FFFFFF' }))), 1024);

// Splash: the mark alone on the ink splash background.
render(join(app, 'splash-icon.png'), svg(master()), 512);

// Favicons: the 48-64 px weight on a rounded tile, and the tiny cut as SVG for browser tabs.
const favicon = svg(tile + master({ stroke: 5, radius: 3 }));
render(join(app, 'favicon.png'), favicon, 48);
render(join(site, 'favicon.png'), favicon, 48);
writeFileSync(join(site, 'favicon.svg'), svg(tile + tinyCut()));
console.log('wrote website/public/favicon.svg');

// The cuts, for the website's nav and preloader to inline.
writeFileSync(join(site, 'mark.svg'), svg(tile + master({ stroke: 5, radius: 3 })));
writeFileSync(join(site, 'mark-small.svg'), svg(tile + smallCut()));
console.log('wrote website/public/mark.svg, mark-small.svg');
