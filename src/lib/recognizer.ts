/**
 * On-device food recognition on Android and iOS, the same way as the web app:
 * Google's SigLIP 2 (Apache 2.0) turns the photo into an embedding and it is
 * compared with every dish the app knows (dish-recognition.ts), run by ONNX
 * Runtime on the phone's CPU. Free, offline once set up, and photos never
 * leave the phone.
 *
 * The 63 MB model downloads once in the background, the first time the camera
 * opens, and is kept in the app's documents. Until it is there (or if the
 * native runtime can't load), the AIY food classifier bundled with the app
 * recognises the photo instead, so nobody waits on a download.
 */
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import jpeg from 'jpeg-js';
import type { InferenceSession, Tensor as OrtTensor } from 'onnxruntime-react-native';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';

import { dishLabels } from './dish-labels';
import { decodeDishTable, DISH_MODEL, type DishTable, recognizeDish } from './dish-recognition';
import type { Food } from './engine';
import { foodFromLabel } from './food-index';
import { type PhotoSource, squareThumbnail } from './image';
import { pickPredictions, type Recognition } from './recognition';

type Ort = { InferenceSession: typeof InferenceSession; Tensor: typeof OrtTensor };

const MODEL_URL = `https://huggingface.co/${DISH_MODEL.repo}/resolve/${DISH_MODEL.revision}/${DISH_MODEL.vision}`;
const models = new Directory(Paths.document, 'models');
/** Named after the pinned revision, so a new model downloads afresh. */
const modelFile = new File(models, `siglip2-${DISH_MODEL.revision.slice(0, 12)}-q4.onnx`);

/** Reads a file into an ArrayBuffer of its own. */
async function bytesOf(file: File) {
  const bytes = await file.bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

let download: Promise<void> | undefined;

/** Fetches the model once, into a temporary file first so a cut-off download never looks complete. */
function downloadModel() {
  download ??= (async () => {
    if (!models.exists) models.create({ intermediates: true, idempotent: true });
    const partial = new File(models, `${modelFile.name}.part`);
    if (partial.exists) partial.delete();
    await File.downloadFileAsync(MODEL_URL, partial, { idempotent: true });
    partial.move(modelFile);
  })().catch((error) => {
    download = undefined;
    throw error;
  });
  return download;
}

async function dishTable(): Promise<DishTable> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require().
  const asset = await Asset.fromModule(require('../../assets/models/dish-embeddings.bin')).downloadAsync();
  return decodeDishTable(await bytesOf(new File(asset.localUri ?? asset.uri)), dishLabels());
}

type Siglip = { ort: Ort; session: InferenceSession; table: DishTable };

let siglipPromise: Promise<Siglip> | undefined;

/** Loads SigLIP 2 from the downloaded model. Rejects while the model isn't downloaded yet. */
function loadSiglip() {
  siglipPromise ??= (async () => {
    if (!modelFile.exists) throw new Error('The SigLIP 2 model is not downloaded yet');
    // Required here, not imported, so a build without the native runtime still starts and falls back to AIY.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ort = require('onnxruntime-react-native') as Ort;
    const [session, table] = await Promise.all([ort.InferenceSession.create(modelFile.uri), dishTable()]);
    return { ort, session, table };
  })().catch((error) => {
    siglipPromise = undefined;
    throw error;
  });
  return siglipPromise;
}

async function recognizeWithSiglip(photo: PhotoSource): Promise<Recognition> {
  const size = DISH_MODEL.inputSize;
  const [{ ort, session, table }, thumbnail] = await Promise.all([loadSiglip(), squareThumbnail(photo, size, false, { crop: false })]);
  const rgba = jpeg.decode(await new File(thumbnail.uri).bytes(), { useTArray: true, formatAsRGBA: true }).data;
  // Channels first, scaled from 0..255 to -1..1.
  const area = size * size;
  const pixels = new Float32Array(3 * area);
  for (let i = 0, source = 0; i < area; i++, source += 4) {
    pixels[i] = rgba[source] / 127.5 - 1;
    pixels[area + i] = rgba[source + 1] / 127.5 - 1;
    pixels[2 * area + i] = rgba[source + 2] / 127.5 - 1;
  }
  const outputs = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', pixels, [1, 3, size, size]) });
  return recognizeDish(table, outputs.pooler_output.data as Float32Array);
}

/** The AIY model takes 192x192 RGB bytes (quantized), not the 224x224 floats its model card describes. */
const AIY_INPUT_SIZE = 192;

let aiyPromise: Promise<TfliteModel> | undefined;

function loadAiy() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro bundles assets via require().
  aiyPromise ??= loadTensorflowModel(require('../../assets/models/aiy-food-v1.tflite'), []).catch((error) => {
    aiyPromise = undefined;
    throw error;
  });
  return aiyPromise;
}

async function recognizeWithAiy(photo: PhotoSource): Promise<Recognition> {
  const [model, thumbnail] = await Promise.all([loadAiy(), squareThumbnail(photo, AIY_INPUT_SIZE)]);
  const bytes = await new File(thumbnail.uri).bytes();
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });

  const pixels = new Uint8Array(AIY_INPUT_SIZE * AIY_INPUT_SIZE * 3);
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

/** Starts loading early, e.g. when the camera opens: the SigLIP 2 model (downloading it the first time) and the AIY fallback. */
export function warmUpRecognizer() {
  if (modelFile.exists) loadSiglip().catch((error) => console.warn('Could not load SigLIP 2', error));
  else downloadModel().catch((error) => console.warn('Could not download SigLIP 2', error));
  loadAiy().catch((error) => console.warn('Could not load the AIY food model', error));
}

export const recognitionAvailable = true;

/** Phones never wait on the model download (AIY covers until it's done), so there is no progress to show. */
export function useModelDownload(): number | null {
  return null;
}

export async function recognizeFood(photo: PhotoSource): Promise<Recognition> {
  if (modelFile.exists) {
    try {
      return await recognizeWithSiglip(photo);
    } catch (error) {
      console.warn('SigLIP 2 is unavailable, using the AIY model instead', error);
    }
  } else {
    downloadModel().catch((error) => console.warn('Could not download SigLIP 2', error));
  }
  return recognizeWithAiy(photo);
}
