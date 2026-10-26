import type { LanguageCode } from '../languages';
import { bn } from './bn';

/** Dish names in other scripts, by language; a dish missing here keeps its English name. */
export const DISH_NAMES: Partial<Record<LanguageCode, Record<string, string>>> = { bn };

/** A dish's name as people write it in this language. */
export function dishName(language: string, name: string) {
  return DISH_NAMES[language as LanguageCode]?.[name] ?? name;
}

/** Every translation of a dish's name, so search finds it in any script. */
export function dishNameTranslations(name: string) {
  return Object.values(DISH_NAMES).flatMap((names) => (names[name] ? [names[name]] : []));
}
