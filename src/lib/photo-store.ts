import { Directory, File, Paths } from 'expo-file-system';

/**
 * Meal photos live in the app's documents folder. Scans store only the file
 * name, because iOS changes the absolute container path between app updates.
 */
const directory = new Directory(Paths.document, 'meals');

export function savePhoto(id: string, sourceUri: string): string {
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const name = `${id}.jpg`;
  const destination = new File(directory, name);
  if (destination.exists) destination.delete();
  new File(sourceUri).copy(destination);
  return name;
}

export function photoUri(photo: string | null): string | null {
  return photo ? new File(directory, photo).uri : null;
}

export function deletePhoto(photo: string | null) {
  if (!photo) return;
  try {
    const file = new File(directory, photo);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not delete photo', error);
  }
}
