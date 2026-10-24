/**
 * Food recognition in the browser: the same AIY food classifier the phone apps
 * bundle (2,023 dishes, Apache 2.0), run by LiteRT.js on WebAssembly. It costs
 * nothing, needs no server, and photos never leave the device. The runtime and
 * model download once, then the browser caches them.
 */
import { type CompiledModel, loadAndCompile, loadLiteRt, Tensor } from '@litertjs/core';
import { Asset } from 'expo-asset';

import type { Food } from './engine';
import { foodFromLabel } from './food-index';
import { type PhotoSource, squarePixels } from './image.web';
import { pickPredictions, type Recognition } from './recognition';

/** The model takes 192x192 RGB bytes (quantized). */
const INPUT_SIZE = 192;
/** The LiteRT.js WebAssembly files, copied into public/ by scripts/copy-web-runtime.mjs. */
const RUNTIME = `${process.env.EXPO_BASE_URL ?? ''}/litert/`;

let modelPromise: Promise<CompiledModel> | undefined;

function loadModel() {
  modelPromise ??= (async () => {
    await loadLiteRt(RUNTIME);
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require().
    const asset = Asset.fromModule(require('../../assets/models/aiy-food-v1.tflite'));
    return loadAndCompile(asset.uri, { accelerator: 'wasm' });
  })().catch((error) => {
    modelPromise = undefined;
    throw error;
  });
  return modelPromise;
}

/** Starts downloading the runtime and model early, e.g. when the camera opens. */
export function warmUpRecognizer() {
  loadModel().catch((error) => console.warn('Could not load the food model', error));
}

export const recognitionAvailable = typeof WebAssembly === 'object';

export async function recognizeFood(photo: PhotoSource): Promise<Recognition> {
  const [model, rgba] = await Promise.all([loadModel(), squarePixels(photo, INPUT_SIZE)]);
  const pixels = new Uint8Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let source = 0, target = 0; target < pixels.length; source += 4) {
    pixels[target++] = rgba[source];
    pixels[target++] = rgba[source + 1];
    pixels[target++] = rgba[source + 2];
  }
  const input = new Tensor(pixels, [1, INPUT_SIZE, INPUT_SIZE, 3]);
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
