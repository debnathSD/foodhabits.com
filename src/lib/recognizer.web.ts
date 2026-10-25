/**
 * Food recognition in the browser with Google's SigLIP 2 (Apache 2.0): the
 * photo is turned into an embedding on the device and compared with every
 * dish the app knows, including all the Bengali and Indian catalog dishes
 * (dish-recognition.ts). ONNX Runtime Web runs it on WebAssembly, so it costs
 * nothing, needs no server, and photos never leave the device.
 *
 * The 63 MB model downloads once from Hugging Face, pinned to a commit, and
 * stays in the browser's Cache Storage. If it can't load, the smaller AIY food
 * classifier the phone apps bundle (LiteRT.js) takes over.
 */
import { type CompiledModel, loadAndCompile, loadLiteRt, Tensor } from '@litertjs/core';
import { Asset } from 'expo-asset';
import type { InferenceSession } from 'onnxruntime-web';
import { useSyncExternalStore } from 'react';

import { dishLabels } from './dish-labels';
import { decodeDishTable, DISH_MODEL, type DishTable, recognizeDish } from './dish-recognition';
import type { Food } from './engine';
import { foodFromLabel } from './food-index';
import { type PhotoSource, squarePixels } from './image.web';
import { pickPredictions, type Recognition } from './recognition';

type Ort = typeof import('onnxruntime-web');

declare global {
  interface Window {
    ort?: Ort;
  }
}

const BASE = process.env.EXPO_BASE_URL ?? '';
/** ONNX Runtime Web, copied into public/ort by scripts/copy-web-runtime.mjs and loaded as a plain script. */
const ORT_SCRIPT = `${BASE}/ort/ort.wasm.min.js`;
const MODEL_URL = `https://huggingface.co/${DISH_MODEL.repo}/resolve/${DISH_MODEL.revision}/${DISH_MODEL.vision}`;
const MODEL_CACHE = 'foodhabits-models';

// Download progress of the model (0-1), or null when it isn't downloading.
let downloadProgress: number | null = null;
const progressListeners = new Set<() => void>();

function setDownloadProgress(value: number | null) {
  downloadProgress = value;
  progressListeners.forEach((listener) => listener());
}

/** How far the one-time model download has got (0-1), or null when nothing is downloading. */
export function useModelDownload() {
  return useSyncExternalStore(
    (listener) => {
      progressListeners.add(listener);
      return () => progressListeners.delete(listener);
    },
    () => downloadProgress,
    () => null,
  );
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

/** The model file, from Cache Storage when we have it, otherwise downloaded (with progress) and cached. */
async function modelBytes() {
  const cache = typeof caches === 'object' ? await caches.open(MODEL_CACHE).catch(() => null) : null;
  const cached = await cache?.match(MODEL_URL);
  if (cached) return new Uint8Array(await cached.arrayBuffer());

  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) throw new Error(`Model download failed (${response.status})`);
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  setDownloadProgress(0);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) setDownloadProgress(Math.min(1, received / total));
    }
  } finally {
    setDownloadProgress(null);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  await cache?.put(MODEL_URL, new Response(bytes)).catch((error) => console.warn('Could not cache the food model', error));
  return bytes;
}

async function dishTable(): Promise<DishTable> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require().
  const asset = Asset.fromModule(require('../../assets/models/dish-embeddings.bin'));
  const buffer = await (await fetch(asset.uri)).arrayBuffer();
  return decodeDishTable(buffer, dishLabels());
}

type Siglip = { ort: Ort; session: InferenceSession; table: DishTable };

let siglipPromise: Promise<Siglip> | undefined;

function loadSiglip() {
  siglipPromise ??= (async () => {
    if (!window.ort) await loadScript(ORT_SCRIPT);
    const ort = window.ort!;
    ort.env.wasm.wasmPaths = `${BASE}/ort/`;
    // Threads need cross-origin isolation, which static hosts such as GitHub Pages can't turn on.
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    // Run the model in a worker so the page keeps animating while it thinks.
    ort.env.wasm.proxy = true;
    const [bytes, table] = await Promise.all([modelBytes(), dishTable()]);
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    return { ort, session, table };
  })().catch((error) => {
    siglipPromise = undefined;
    throw error;
  });
  return siglipPromise;
}

async function recognizeWithSiglip(photo: PhotoSource): Promise<Recognition> {
  const size = DISH_MODEL.inputSize;
  const [{ ort, session, table }, rgba] = await Promise.all([loadSiglip(), squarePixels(photo, size, { crop: false })]);
  // Channels first, scaled from 0..255 to -1..1.
  const area = size * size;
  const pixels = new Float32Array(3 * area);
  for (let i = 0, source = 0; i < area; i++, source += 4) {
    pixels[i] = rgba[source] / 127.5 - 1;
    pixels[area + i] = rgba[source + 1] / 127.5 - 1;
    pixels[2 * area + i] = rgba[source + 2] / 127.5 - 1;
  }
  const input = new ort.Tensor('float32', pixels, [1, 3, size, size]);
  const outputs = await session.run({ [session.inputNames[0]]: input });
  return recognizeDish(table, outputs.pooler_output.data as Float32Array);
}

/** The AIY model takes 192x192 RGB bytes (quantized). */
const AIY_INPUT_SIZE = 192;
/** The LiteRT.js WebAssembly files, copied into public/ by scripts/copy-web-runtime.mjs. */
const LITERT_RUNTIME = `${BASE}/litert/`;

let aiyPromise: Promise<CompiledModel> | undefined;

function loadAiy() {
  aiyPromise ??= (async () => {
    await loadLiteRt(LITERT_RUNTIME);
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require().
    const asset = Asset.fromModule(require('../../assets/models/aiy-food-v1.tflite'));
    return loadAndCompile(asset.uri, { accelerator: 'wasm' });
  })().catch((error) => {
    aiyPromise = undefined;
    throw error;
  });
  return aiyPromise;
}

async function recognizeWithAiy(photo: PhotoSource): Promise<Recognition> {
  const [model, rgba] = await Promise.all([loadAiy(), squarePixels(photo, AIY_INPUT_SIZE)]);
  const pixels = new Uint8Array(AIY_INPUT_SIZE * AIY_INPUT_SIZE * 3);
  for (let source = 0, target = 0; target < pixels.length; source += 4) {
    pixels[target++] = rgba[source];
    pixels[target++] = rgba[source + 1];
    pixels[target++] = rgba[source + 2];
  }
  const input = new Tensor(pixels, [1, AIY_INPUT_SIZE, AIY_INPUT_SIZE, 3]);
  try {
    const [output] = await model.run(input);
    try {
      // Quantized output: probability = value / 256.
      const scores = Array.from(output.toTypedArray() as Uint8Array, (value) => value / 256);
      return pickPredictions(scores, (index): Food | null => foodFromLabel(index));
    } finally {
      output.delete();
    }
  } finally {
    input.delete();
  }
}

/** Starts downloading the runtime and model early, e.g. when the camera opens. */
export function warmUpRecognizer() {
  loadSiglip().catch((error) => console.warn('Could not load the food model', error));
}

export const recognitionAvailable = typeof WebAssembly === 'object';

export async function recognizeFood(photo: PhotoSource): Promise<Recognition> {
  try {
    return await recognizeWithSiglip(photo);
  } catch (error) {
    console.warn('SigLIP 2 is unavailable, using the AIY model instead', error);
    return recognizeWithAiy(photo);
  }
}
