/**
 * The dishes the photo recognizer chooses between, and the sentence it
 * compares each photo with. SigLIP 2 scores a photo against a sentence, so
 * any dish we can name can be recognized: the hand-written catalog (Bengali
 * and Indian food first) plus every named dish of the old AIY model. The
 * build step embeds these sentences once (scripts/build-dish-embeddings.mjs);
 * the app ships the embeddings in the same order.
 */
import { CATEGORIES, type CategoryId } from '../data/categories';
import { CATALOG, LABEL_ALIASES } from '../data/catalog';
import labelsJson from '../data/food-labels.json';
import { en } from '../i18n/locales/en';
import type { FoodRef } from './engine';

type LabelEntry = [name: string, category: CategoryId, ...rest: unknown[]] | null;

export type DishLabel = { ref: Exclude<FoodRef, { kind: 'generic' }>; name: string; prompts: string[] };

const normal = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();

/** "a photo of payesh, a milk sweet." SigLIP 2 was trained on lowercase text. */
export function dishPrompt(name: string, category: CategoryId) {
  return `a photo of ${normal(name)}, a ${en.categories[category]}.`;
}

/**
 * One sentence for the name and one per alias written in Latin letters:
 * aliases such as "fermented rice" (panta bhat) describe a dish in words the
 * model knows even when it has never seen the dish's own name.
 */
function prompts(name: string, aliases: string[] | undefined, category: CategoryId) {
  const names = [name, ...(aliases ?? []).filter((alias) => /^[\p{Script=Latin}\d\s'’&.,()-]+$/u.test(alias))];
  return [...new Set(names.map(normal))].map((each) => dishPrompt(each, category));
}

export function dishLabels(): DishLabel[] {
  const rows: DishLabel[] = [];
  const seen = new Set<string>();
  for (const food of CATALOG) {
    seen.add(normal(food.name));
    rows.push({ ref: { kind: 'catalog', name: food.name }, name: food.name, prompts: prompts(food.name, food.aliases, food.category) });
  }
  (labelsJson as LabelEntry[]).forEach((entry, index) => {
    if (!entry || !(entry[1] in CATEGORIES) || seen.has(normal(entry[0]))) return;
    seen.add(normal(entry[0]));
    rows.push({ ref: { kind: 'label', index }, name: entry[0], prompts: prompts(entry[0], LABEL_ALIASES[entry[0]], entry[1]) });
  });
  return rows;
}

/** FNV-1a over every sentence, so stale embeddings are caught instead of silently mislabelling dishes. */
export function promptsHash(labels: DishLabel[]) {
  let hash = 0x811c9dc5;
  for (const text of [...labels.flatMap((label) => label.prompts), ...NOT_FOOD_PROMPTS]) {
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    hash = Math.imul(hash ^ 10, 0x01000193);
  }
  return hash >>> 0;
}

/** Things a photo might show instead of a meal; if one of these wins, it isn't food. */
export const NOT_FOOD_PROMPTS = [
  'a photo of a person.',
  'a selfie.',
  'a photo of a hand.',
  'a photo of a dog.',
  'a photo of a cat.',
  'a photo of a room.',
  'a photo of furniture.',
  'a photo of a car.',
  'a photo of a building.',
  'a photo of a street.',
  'a photo of a landscape.',
  'a photo of a document with text.',
  'a screenshot of a phone screen.',
  'a photo of a computer.',
  'a photo of clothes.',
  'a photo of an empty plate.',
  'a blurry photo.',
  'a dark photo.',
];
