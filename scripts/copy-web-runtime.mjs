#!/usr/bin/env node
/**
 * Copies the LiteRT.js WebAssembly runtime into public/litert so the web app
 * can run the food model in the browser. Only the single-threaded builds: the
 * threaded one needs cross-origin isolation headers that static hosts such as
 * GitHub Pages cannot send.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@litertjs', 'core', 'wasm');
const target = join(root, 'public', 'litert');
mkdirSync(target, { recursive: true });
for (const name of ['litert_wasm_internal', 'litert_wasm_compat_internal']) {
  for (const extension of ['js', 'wasm']) copyFileSync(join(source, `${name}.${extension}`), join(target, `${name}.${extension}`));
}
console.log('Copied the LiteRT.js runtime to public/litert');
