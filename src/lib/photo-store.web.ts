/**
 * In the browser, each meal photo is kept as a small JPEG data URI under its
 * own storage key, so the meal list stays light. When storage is full, the
 * oldest photos make room; their meals keep everything but the picture.
 */
const PREFIX = 'foodhabits/photo/';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function oldestPhotoKey(store: Storage) {
  const keys = Object.keys(store).filter((key) => key.startsWith(PREFIX));
  // Scan ids start with a timestamp, so they sort oldest first.
  return keys.sort()[0];
}

export function savePhoto(id: string, sourceUri: string): string {
  const store = storage();
  if (!store) return sourceUri;
  const key = `${PREFIX}${id}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      store.setItem(key, sourceUri);
      return id;
    } catch {
      const oldest = oldestPhotoKey(store);
      if (!oldest || oldest === key) break;
      store.removeItem(oldest);
    }
  }
  return sourceUri;
}

export function photoUri(photo: string | null): string | null {
  if (!photo) return null;
  // Older entries stored the data URI itself.
  if (photo.startsWith('data:')) return photo;
  return storage()?.getItem(`${PREFIX}${photo}`) ?? null;
}

export function deletePhoto(photo: string | null) {
  if (photo && !photo.startsWith('data:')) storage()?.removeItem(`${PREFIX}${photo}`);
}
