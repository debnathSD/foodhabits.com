/**
 * Picks the dish in a photo by comparing its SigLIP 2 image embedding with
 * the embedded sentences of every dish (see dish-labels.ts). Pure, so it is
 * unit-tested and evaluated without the browser runtime.
 *
 * dish-embeddings.bin, written by scripts/build-dish-embeddings.mts
 * (little-endian):
 *   Uint32 magic, version, dim, vectorCount, labelCount, notFoodCount, promptsHash
 *   Float32 scale[vectorCount]   int8 row × scale = unit-length text embedding
 *   Float32 prior[labelCount]    how common the dish is (Wikipedia readership)
 *   Uint16 prompts[labelCount]   sentences per dish, in dishLabels() order
 *   Int8 vectors[vectorCount × dim]   dish sentences first, then not-food sentences
 */
import { type DishLabel, NOT_FOOD_PROMPTS, promptsHash } from './dish-labels';
import type { Food } from './engine';
import { resolveFood } from './food-index';
import type { Prediction, Recognition } from './recognition';

/** Google's SigLIP 2 (Apache 2.0), converted to ONNX by the Hugging Face ONNX community; pinned to a commit. */
export const DISH_MODEL = {
  repo: 'onnx-community/siglip2-base-patch16-224-ONNX',
  revision: 'ba1f3b0843f24bc5417d38e19c37b287d719b2f4',
  vision: 'onnx/vision_model_q4.onnx',
  textDtype: 'q8',
  inputSize: 224,
} as const;

const MAGIC = 0x45444846; // "FHDE"
const VERSION = 1;
const HEADER_WORDS = 7;

export type DishTable = {
  dim: number;
  labels: DishLabel[];
  vectors: Int8Array;
  scales: Float32Array;
  prior: Float32Array;
  /** First vector of each dish; the dish's sentences run up to the next one. */
  starts: Uint32Array;
  notFoodStart: number;
};

export function encodeDishTable(labels: DishLabel[], embeddings: Float32Array[], notFood: Float32Array[], prior: number[]) {
  const rows = [...embeddings, ...notFood];
  const dim = rows[0].length;
  const header = new Uint32Array([MAGIC, VERSION, dim, rows.length, labels.length, notFood.length, promptsHash(labels)]);
  const scales = new Float32Array(rows.length);
  const vectors = new Int8Array(rows.length * dim);
  rows.forEach((row, r) => {
    const max = row.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
    scales[r] = max / 127;
    for (let d = 0; d < dim; d++) vectors[r * dim + d] = Math.round(row[d] / scales[r]);
  });
  const counts = new Uint16Array(labels.map((label) => label.prompts.length));
  const parts = [header, scales, Float32Array.from(prior), counts, vectors];
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), offset);
    offset += part.byteLength;
  }
  return bytes;
}

/** Reads the table and checks it was built from these exact dish sentences. */
export function decodeDishTable(buffer: ArrayBuffer, labels: DishLabel[]): DishTable {
  const header = new Uint32Array(buffer, 0, HEADER_WORDS);
  const [magic, version, dim, vectorCount, labelCount, notFoodCount, hash] = header;
  if (magic !== MAGIC || version !== VERSION) throw new Error('Not a dish embeddings file');
  if (labelCount !== labels.length || notFoodCount !== NOT_FOOD_PROMPTS.length || hash !== promptsHash(labels)) {
    throw new Error('Dish embeddings are out of date: run npm run build:dishes');
  }
  let offset = HEADER_WORDS * 4;
  const scales = new Float32Array(buffer, offset, vectorCount);
  offset += vectorCount * 4;
  const prior = new Float32Array(buffer, offset, labelCount);
  offset += labelCount * 4;
  const counts = new Uint16Array(buffer, offset, labelCount);
  offset += labelCount * 2;
  const vectors = new Int8Array(buffer, offset, vectorCount * dim);
  const starts = new Uint32Array(labelCount + 1);
  for (let i = 0; i < labelCount; i++) starts[i + 1] = starts[i] + counts[i];
  return { dim, labels, vectors, scales, prior, starts, notFoodStart: starts[labelCount] };
}

/** Below this cosine similarity to every dish sentence, the photo shows no food we know. */
const MIN_SIMILARITY = 0.09;
/** Sharpness of the softmax that turns similarities into confidences (SigLIP's learned scale is about this). */
const TEMPERATURE = 100;
/** Shown straight away from this confidence on; right about 19 times in 20 in testing. */
const MATCH_CONFIDENCE = 0.5;

function similarity(table: DishTable, row: number, image: Float32Array) {
  const { dim, vectors } = table;
  let sum = 0;
  for (let d = 0, at = row * dim; d < dim; d++, at++) sum += vectors[at] * image[d];
  return sum * table.scales[row];
}

/** `image` is the vision model's pooled output; its length need not be 1. */
export function recognizeDish(table: DishTable, image: Float32Array, max = 4): Recognition {
  const length = Math.hypot(...image) || 1;
  const unit = image.map((x) => x / length);
  const { labels, starts, prior } = table;

  const best = new Float32Array(labels.length);
  for (let i = 0; i < labels.length; i++) {
    let top = -1;
    for (let row = starts[i]; row < starts[i + 1]; row++) top = Math.max(top, similarity(table, row, unit));
    best[i] = top;
  }
  let notFood = -1;
  for (let row = table.notFoodStart; row < table.notFoodStart + NOT_FOOD_PROMPTS.length; row++) {
    notFood = Math.max(notFood, similarity(table, row, unit));
  }

  const ranked = [...best.keys()].sort((a, b) => best[b] + prior[b] - (best[a] + prior[a]));
  const first = ranked[0];
  if (best[first] < MIN_SIMILARITY || notFood > best[first]) return { kind: 'not_food' };

  // Confidence: softmax over the closest few, which is where nearly all the mass is.
  const close = ranked.slice(0, 20);
  const top = best[first] + prior[first];
  const weights = close.map((i) => Math.exp(TEMPERATURE * (best[i] + prior[i] - top)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  const predictions: Prediction[] = [];
  for (let k = 0; k < close.length && predictions.length < max; k++) {
    const food: Food | null = resolveFood(labels[close[k]].ref);
    if (food && !predictions.some((p) => p.food.name === food.name)) {
      predictions.push({ index: close[k], food, confidence: weights[k] / total });
    }
  }
  if (predictions[0].confidence >= MATCH_CONFIDENCE) {
    return { kind: 'match', prediction: predictions[0], alternatives: predictions.slice(1) };
  }
  return { kind: 'choose', predictions };
}
