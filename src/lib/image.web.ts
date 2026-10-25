export type PhotoSource = { uri: string; width: number; height: number };

/** Longest edge of the copy kept in history. Smaller than on phones: the browser stores it as text. */
const DISPLAY_EDGE = 720;

/** Decodes a blob:, data: or http(s) image, upright (phone photos carry their rotation in EXIF). */
async function loadImage(uri: string) {
  const blob = await (await fetch(uri)).blob();
  return createImageBitmap(blob, { imageOrientation: 'from-image' });
}

/** Downscales a camera or library photo to a JPEG data URI that survives a page reload. */
export async function preparePhoto(source: PhotoSource): Promise<PhotoSource> {
  const image = await loadImage(source.uri);
  const scale = Math.min(1, DISPLAY_EDGE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
  image.close();
  return { uri: canvas.toDataURL('image/jpeg', 0.78), width, height };
}

/**
 * Scales to `size` x `size` and returns the RGBA pixels, ready for a food model:
 * centre-cropped to a square, or (`crop: false`) the whole photo squashed to
 * fit, which is how SigLIP was trained.
 */
export async function squarePixels(source: PhotoSource, size: number, { crop = true } = {}) {
  const image = await loadImage(source.uri);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.imageSmoothingQuality = 'high';
  if (crop) context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
  else context.drawImage(image, 0, 0, size, size);
  image.close();
  return context.getImageData(0, 0, size, size).data;
}
