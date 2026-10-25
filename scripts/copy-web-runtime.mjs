#!/usr/bin/env node
/**
 * Copies the web app's runtime files into public/ before a web build:
 * - ONNX Runtime Web (public/ort), which runs the SigLIP 2 food recognizer in
 *   the browser: the plain-script CPU and WebGPU builds and their WebAssembly
 *   (the threaded builds also run on one thread, which is all GitHub Pages
 *   allows).
 * - the LiteRT.js WebAssembly runtime (public/litert) for the AIY fallback
 *   model. Only the single-threaded builds: the threaded one needs
 *   cross-origin isolation headers that static hosts such as GitHub Pages
 *   cannot send.
 * - the website's photoscanned food and studio HDRI (public/models, public/hdri)
 *   for the web app's 3D.
 * They are copied rather than committed because Expo also bundles public/ into
 * the phone apps, which don't use them.
 */
import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@litertjs', 'core', 'wasm');
const target = join(root, 'public', 'litert');
mkdirSync(target, { recursive: true });
for (const name of ['litert_wasm_internal', 'litert_wasm_compat_internal']) {
  for (const extension of ['js', 'wasm']) copyFileSync(join(source, `${name}.${extension}`), join(target, `${name}.${extension}`));
}
const ort = join(root, 'node_modules', 'onnxruntime-web', 'dist');
mkdirSync(join(root, 'public', 'ort'), { recursive: true });
// The CPU build, and the WebGPU build with its WebAssembly (loaded only where the browser has WebGPU).
for (const name of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm', 'ort.webgpu.min.js', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) {
  copyFileSync(join(ort, name), join(root, 'public', 'ort', name));
}
for (const folder of ['models', 'hdri']) {
  cpSync(join(root, 'website', 'public', folder), join(root, 'public', folder), { recursive: true });
}
console.log('Copied ONNX Runtime Web, the LiteRT.js runtime, photoscans and HDRI into public/');
