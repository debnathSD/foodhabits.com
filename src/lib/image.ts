import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type PhotoSource = { uri: string; width: number; height: number };

/** Longest edge of the copy kept in history. */
const DISPLAY_EDGE = 1080;

/** Downscales a camera or library photo to a JPEG suitable for storing and recognising. */
export async function preparePhoto(source: PhotoSource): Promise<PhotoSource> {
  const context = ImageManipulator.manipulate(source.uri);
  if (Math.max(source.width, source.height) > DISPLAY_EDGE) {
    context.resize(source.width >= source.height ? { width: DISPLAY_EDGE } : { height: DISPLAY_EDGE });
  }
  const image = await context.renderAsync();
  try {
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    return { uri: result.uri, width: result.width, height: result.height };
  } finally {
    image.release();
    context.release();
  }
}

/**
 * Centre-crops to a square and scales to `size` x `size`, the input the food
 * model expects. Returns the JPEG's file URI and, on request, its base64.
 */
export async function squareThumbnail(source: PhotoSource, size: number, base64 = false) {
  const side = Math.min(source.width, source.height);
  const context = ImageManipulator.manipulate(source.uri)
    .crop({
      originX: Math.floor((source.width - side) / 2),
      originY: Math.floor((source.height - side) / 2),
      width: side,
      height: side,
    })
    .resize({ width: size, height: size });
  const image = await context.renderAsync();
  try {
    return await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.95, base64 });
  } finally {
    image.release();
    context.release();
  }
}
