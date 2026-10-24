/**
 * On-device food recognition with Google's AIY food classifier (2,023 dishes,
 * Apache 2.0). The model is bundled with the app and runs on the phone's CPU,
 * so recognition is free and works offline.
 */
import { File } from 'expo-file-system';
import jpeg from 'jpeg-js';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import type { Food } from './engine';
import { foodFromLabel } from './food-index';
import { type PhotoSource, squareThumbnail } from './image';
import { pickPredictions, type Recognition } from './recognition';

/** The TFLite model takes 192x192 RGB bytes (quantized), not the 224x224 floats its model card describes. */
const INPUT_SIZE = 192;

let modelPromise: Promise<TfliteModel> | undefined;

function loadModel() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require().
  modelPromise ??= loadTensorflowModel(require('../../assets/models/aiy-food-v1.tflite'), []).catch((error) => {
    modelPromise = undefined;
    throw error;
  });
  return modelPromise;
}

/** Starts loading the model early, e.g. when the camera opens. */
export function warmUpRecognizer() {
  loadModel().catch((error) => console.warn('Could not load the food model', error));
}

export const recognitionAvailable = true;

export async function recognizeFood(photo: PhotoSource): Promise<Recognition> {
  const [model, thumbnail] = await Promise.all([loadModel(), squareThumbnail(photo, INPUT_SIZE)]);
  const bytes = await new File(thumbnail.uri).bytes();
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });

  const pixels = new Uint8Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let source = 0, target = 0; target < pixels.length; source += 4) {
    pixels[target++] = decoded.data[source];
    pixels[target++] = decoded.data[source + 1];
    pixels[target++] = decoded.data[source + 2];
  }

  const [output] = await model.run([pixels.buffer]);
  // Quantized output: probability = value / 256.
  const scores = Array.from(new Uint8Array(output), (value) => value / 256);
  return pickPredictions(scores, (index): Food | null => foodFromLabel(index));
}
