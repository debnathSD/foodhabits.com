/**
 * Every food the app knows: the photo model's dishes (by output index) plus
 * the typed-search catalog. Resolves saved references and powers search.
 */
import { type Allergen, CATEGORIES, type CategoryId, type FoodDiet } from '../data/categories';
import { CATALOG, LABEL_ALIASES } from '../data/catalog';
import labelsJson from '../data/food-labels.json';
import type { Food, FoodRef } from './engine';

type LabelEntry = [name: string, category: CategoryId, diet: FoodDiet | null, allergens: Allergen[]] | null;

const LABELS = labelsJson as LabelEntry[];

function withDefaults(name: string, category: CategoryId, diet: FoodDiet | null | undefined, allergens: Allergen[] | undefined) {
  const profile = CATEGORIES[category];
  return {
    name,
    category,
    diet: diet ?? profile.diet,
    allergens: [...new Set([...profile.allergens, ...(allergens ?? [])])],
  };
}

export function foodFromLabel(index: number): Food | null {
  const entry = LABELS[index];
  if (!entry) return null;
  const [name, category, diet, allergens] = entry;
  return { ref: { kind: 'label', index }, ...withDefaults(name, category, diet, allergens) };
}

export function foodFromCatalog(name: string): Food | null {
  const item = CATALOG.find((candidate) => candidate.name === name);
  if (!item) return null;
  return {
    ref: { kind: 'catalog', name },
    // An explicit empty allergen list in the catalog means "none", so don't merge defaults.
    ...withDefaults(item.name, item.category, item.diet, undefined),
    ...(item.allergens ? { allergens: item.allergens } : {}),
  };
}

export function genericFood(category: CategoryId): Food {
  return { ref: { kind: 'generic', category }, ...withDefaults(category, category, undefined, undefined) };
}

export function resolveFood(ref: FoodRef): Food | null {
  if (ref.kind === 'label') return foodFromLabel(ref.index);
  if (ref.kind === 'catalog') return foodFromCatalog(ref.name);
  return genericFood(ref.category);
}

/** Lowercase, strip accents and punctuation so "Crème brûlée" matches "creme brulee". */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Keep letters, vowel signs and digits in any script (Bengali, Devanagari...), drop punctuation.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type SearchEntry = { food: Food; terms: string[]; common: boolean };

let index: SearchEntry[] | undefined;

function searchIndex() {
  if (index) return index;
  const entries: SearchEntry[] = CATALOG.map((item) => ({
    food: foodFromCatalog(item.name)!,
    terms: [item.name, ...(item.aliases ?? [])].map(normalize),
    common: true,
  }));
  LABELS.forEach((entry, labelIndex) => {
    if (!entry) return;
    const aliases = LABEL_ALIASES[entry[0]];
    entries.push({
      food: foodFromLabel(labelIndex)!,
      terms: [entry[0], ...(aliases ?? [])].map(normalize),
      common: Boolean(aliases),
    });
  });
  index = entries;
  return entries;
}

function termScore(term: string, query: string, words: string[]) {
  if (term === query) return 100;
  if (term.startsWith(query)) return 80;
  const termWords = term.split(' ');
  if (words.every((word) => termWords.some((termWord) => termWord.startsWith(word)))) return 60;
  if (term.includes(query)) return 40;
  return 0;
}

export function searchFoods(query: string, limit = 25): Food[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const words = normalized.split(' ');
  const scored: { food: Food; score: number }[] = [];
  for (const entry of searchIndex()) {
    // A dish's own name outranks the same match on one of its aliases.
    const best = Math.max(
      ...entry.terms.map((term, position) => {
        const score = termScore(term, normalized, words);
        return score > 0 && position === 0 ? score + 3 : score;
      }),
    );
    if (best > 0) {
      scored.push({ food: entry.food, score: best + (entry.common ? 15 : 0) - entry.food.name.length / 100 });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const results: Food[] = [];
  for (const { food } of scored) {
    if (seen.has(food.name)) continue;
    seen.add(food.name);
    results.push(food);
    if (results.length === limit) break;
  }
  return results;
}

/** Broad food types offered when a search finds nothing. */
export const GENERIC_CHOICES: CategoryId[] = [
  'fried_snack', 'curry_veg', 'curry_meat', 'legumes', 'rice_dish', 'stuffed_bread', 'sandwich', 'pizza',
  'noodles', 'salad', 'soup_veg', 'egg_dish', 'grilled_meat', 'fried_meat', 'fish', 'cake_pastry',
  'milk_sweet', 'fried_sweet', 'fruit', 'soda', 'milk_tea', 'juice', 'alcohol', 'mixed',
];
