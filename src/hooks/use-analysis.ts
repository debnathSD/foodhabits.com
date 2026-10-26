import { dishName } from '@/i18n/dish-names';
import { useTranslation } from '@/i18n/use-translation';
import { analyzeFood, type Food } from '@/lib/engine';
import { resolveFood } from '@/lib/food-index';
import { type Scan, useAppState } from '@/lib/store';

/** Display name for a food in the user's language (Bengali script for Bengali), and for the generic "Any curry" entries. */
export function useFoodName() {
  const { t, language } = useTranslation();
  return (food: Food) =>
    food.ref.kind === 'generic' ? t('search.generic', { category: t(`categories.${food.category}`) }) : dishName(language, food.name);
}

/** The analysis for a logged meal, computed with the user's current profile. */
export function useAnalysis(scan: Scan | undefined) {
  const profile = useAppState((state) => state.profile);
  const foodName = useFoodName();
  const food = scan ? resolveFood(scan.food) : null;
  if (!scan || !food) return null;
  const analysis = analyzeFood(food, { profile, hour: new Date(scan.createdAt).getHours() });
  return { food, name: foodName(food), analysis };
}
