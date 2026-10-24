import type { Food } from './engine';
import { savePhoto } from './photo-store';
import { addScan, createScanId } from './store';

/** Saves a meal (and a copy of its photo) to history and returns its id. */
export function logMeal({
  food,
  photo,
  confidence,
  alternatives,
}: {
  food: Food;
  /** URI of the prepared photo, if the meal came from the camera or library. */
  photo?: string | null;
  confidence?: number;
  alternatives?: number[];
}) {
  const id = createScanId();
  addScan({
    id,
    createdAt: Date.now(),
    food: food.ref,
    photo: photo ? savePhoto(id, photo) : null,
    source: photo ? 'photo' : 'search',
    confidence,
    alternatives,
  });
  return id;
}
