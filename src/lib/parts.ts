import type { Part } from './deconstruct';
import type { Analysis } from './engine';

const MAX_PARTS = 5;

/**
 * What a dish is made of, for the take-apart scene: the parts that help first,
 * then the ones that harm, at most three of each and five in all. Empty when
 * the analysis has nothing worth showing (water, black tea).
 */
export function foodParts(analysis: Analysis): Part[] {
  const gut = new Set(analysis.gut.map((item) => item.id));
  const body = new Set(analysis.body.map((item) => item.id));
  const { fiber, protein, sugar, sodium, satFat } = analysis.nutrition;

  const good: Part[] = [];
  if (fiber !== 'low') good.push({ kind: 'fiber', good: true, amount: fiber === 'high' ? 1 : 0.6 });
  if (gut.has('fermented')) good.push({ kind: 'probiotics', good: true, amount: 1 });
  if (protein !== 'low') good.push({ kind: 'protein', good: true, amount: protein === 'high' ? 1 : 0.6 });
  if (body.has('heart_fats') || gut.has('oily_fish') || gut.has('nuts_seeds')) good.push({ kind: 'goodFats', good: true, amount: 0.8 });
  if (body.has('vitamins') || gut.has('vegetables') || gut.has('fruit')) good.push({ kind: 'vitamins', good: true, amount: 0.8 });
  if (body.has('hydrating')) good.push({ kind: 'water', good: true, amount: 0.8 });

  const bad: Part[] = [];
  if (gut.has('fried')) bad.push({ kind: 'oil', good: false, amount: 1 });
  if (gut.has('refined_carbs')) bad.push({ kind: 'starch', good: false, amount: 0.9 });
  if (sugar === 'high' || gut.has('sugar_high') || gut.has('sugary_drink')) {
    bad.push({ kind: 'sugar', good: false, amount: sugar === 'high' ? 1 : 0.6 });
  }
  if (gut.has('ultra_processed') || gut.has('processed_meat')) bad.push({ kind: 'additives', good: false, amount: 0.8 });
  if (gut.has('alcohol') || body.has('alcohol')) bad.push({ kind: 'alcohol', good: false, amount: 1 });
  if (sodium === 'high' || body.has('salt_high')) bad.push({ kind: 'salt', good: false, amount: sodium === 'high' ? 1 : 0.6 });
  // Frying already covers the fat in fried food.
  if (!gut.has('fried') && (satFat === 'high' || body.has('sat_fat_high'))) bad.push({ kind: 'satFat', good: false, amount: 0.8 });

  let goodCount = Math.min(good.length, 3);
  let badCount = Math.min(bad.length, 3);
  while (goodCount + badCount > MAX_PARTS) {
    if (goodCount > badCount) goodCount--;
    else badCount--;
  }
  return [...good.slice(0, goodCount), ...bad.slice(0, badCount)];
}

/** A crust colour for the whole dish, from what it is mostly made of. */
export function partsColor(parts: Part[]) {
  const has = (kind: Part['kind']) => parts.some((part) => part.kind === kind);
  if (has('oil')) return '#D39545';
  if (has('starch')) return '#E2C894';
  if (has('vitamins') && !parts.some((part) => !part.good)) return '#6FAE4E';
  if (has('sugar')) return '#C9607A';
  if (has('protein')) return '#B8704E';
  return '#C9A46A';
}
