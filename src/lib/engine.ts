/**
 * Turns a food into the analysis the result screen shows: gut score, effects
 * on the gut and body, disease risks, what to avoid next and better swaps.
 *
 * Runs entirely on the phone from the category profiles, so it is free,
 * instant and works offline. The output is language-neutral (ids, not
 * sentences); the UI renders it in the user's language with `t()`.
 */
import {
  type Allergen,
  CATEGORIES,
  type CategoryId,
  DRINK_CATEGORIES,
  type Flag,
  type FoodDiet,
  type Level,
} from '../data/categories';
import { FOOD_TWEAKS } from '../data/food-tweaks';
import type { DietId, Profile } from './profile-options';
import { type Verdict, verdictForScore } from './verdict';

export type FoodRef =
  | { kind: 'label'; index: number }
  | { kind: 'catalog'; name: string }
  | { kind: 'generic'; category: CategoryId };

export type Food = {
  ref: FoodRef;
  name: string;
  category: CategoryId;
  diet: FoodDiet | null;
  allergens: Allergen[];
};

export type Effect = 'good' | 'bad' | 'mixed';
export type Timeframe = 'next meal' | 'rest of today' | 'next few days';

export type GutEffectId =
  | 'fiber_high' | 'fiber_low' | 'fermented' | 'fried' | 'processed_meat' | 'ultra_processed'
  | 'sugar_high' | 'refined_carbs' | 'legumes' | 'vegetables' | 'whole_grains' | 'creamy' | 'spicy'
  | 'alcohol' | 'caffeine' | 'oily_fish' | 'nuts_seeds' | 'fruit' | 'red_meat' | 'sugary_drink' | 'light';
export type BodyEffectId =
  | 'blood_sugar' | 'salt_high' | 'sat_fat_high' | 'calorie_dense' | 'protein_good' | 'fiber_full'
  | 'heart_fats' | 'alcohol' | 'caffeine' | 'vitamins' | 'hydrating';
export type RiskId =
  | 'colorectal_cancer' | 'heart_disease' | 'type2_diabetes' | 'obesity' | 'hypertension' | 'stroke'
  | 'fatty_liver' | 'tooth_decay' | 'liver_disease' | 'alcohol_cancers' | 'high_cholesterol'
  | 'constipation' | 'sleep';
export type AvoidId =
  | 'fried' | 'sugary' | 'refined_carbs' | 'processed_meat' | 'red_meat' | 'salty' | 'alcohol'
  | 'caffeine' | 'spicy' | 'heavy' | 'dairy' | 'ultra_processed' | 'late_heavy';
export type InsteadId =
  | 'lentils_greens' | 'grilled_veg' | 'grilled_meat' | 'water' | 'whole_grains' | 'plant_protein'
  | 'lean_protein' | 'fruit_nuts' | 'sparkling' | 'herbal' | 'mild' | 'light_meal' | 'lactose_free'
  | 'home_cooked' | 'early_light';
export type EatId =
  | 'greens' | 'legumes' | 'yogurt' | 'fermented' | 'fruit' | 'nuts' | 'protein_veg' | 'protein_vegan'
  | 'protein_meat' | 'water' | 'whole_grains' | 'more_of_this';
export type FactorId =
  | 'fiber_high' | 'fiber_low' | 'fermented' | 'legumes' | 'vegetables' | 'whole_grains' | 'fruit'
  | 'oily_fish' | 'nuts_seeds' | 'lean_protein' | 'fried' | 'sugar_high' | 'refined_carbs'
  | 'processed_meat' | 'sodium_high' | 'sat_fat_high' | 'ultra_processed' | 'alcohol' | 'sugary_drink';

export type WatchOut =
  | { kind: 'allergens'; allergens: Allergen[] }
  | { kind: 'dietConflict'; what: 'meat' | 'fish' | 'egg' | 'dairy'; diet: DietId }
  | { kind: 'note'; key: 'dietVaries' | 'jain' | 'lactose' | 'gluten' | 'ibs' | 'reflux' | 'bloodSugar' | 'bloodPressure' | 'nutAllergy' };

export type Analysis = {
  score: number;
  verdict: Verdict;
  summary: { kind: 'good' | 'mixed' | 'bad' | 'neutral'; good: FactorId[]; bad: FactorId[] };
  gut: { id: GutEffectId; effect: Effect }[];
  body: { id: BodyEffectId; effect: Effect }[];
  risks: RiskId[];
  avoid: { id: AvoidId; timeframe: Timeframe; instead: InsteadId }[];
  eat: EatId[];
  swaps: CategoryId;
  watch: WatchOut[];
  nutrition: { fiber: Level; sugar: Level; sodium: Level; satFat: Level; protein: Level; kcal: [number, number] };
};

export type AnalysisContext = {
  profile: Profile;
  /** Local hour (0-23) the meal was logged, for time-of-day advice. */
  hour: number;
};

const FIBER_SCORE: Record<Level, number> = { high: 2, medium: 0.5, low: -0.75 };
const SUGAR_PENALTY: Record<Level, number> = { high: 1.25, medium: 0.25, low: 0 };
const SAT_FAT_PENALTY: Record<Level, number> = { high: 0.75, medium: 0.25, low: 0 };
const FLAG_SCORE: Partial<Record<Flag, number>> = {
  fermented: 2,
  legumes: 1,
  wholeGrains: 1,
  vegetables: 0.5,
  fruit: 0.5,
  nutsSeeds: 0.5,
  oilyFish: 0.5,
  fried: -1.75,
  refinedCarbs: -0.5,
  processedMeat: -1.5,
  redMeat: -0.5,
  ultraProcessed: -0.75,
  creamy: -0.25,
  sugaryDrink: -2,
  alcohol: -3,
};

/** Category profile with the dish's own tweaks applied. */
export function resolveProfile(food: Food) {
  const base = CATEGORIES[food.category];
  const tweak = FOOD_TWEAKS[food.name] ?? {};
  const flags = new Set<Flag>([...base.flags, ...(tweak.add ?? [])]);
  for (const flag of tweak.remove ?? []) flags.delete(flag);
  return {
    fiber: tweak.fiber ?? base.fiber,
    sugar: tweak.sugar ?? base.sugar,
    sodium: tweak.sodium ?? base.sodium,
    satFat: tweak.satFat ?? base.satFat,
    protein: tweak.protein ?? base.protein,
    kcal: tweak.kcal ?? base.kcal,
    flags,
  };
}

export function analyzeFood(food: Food, { profile, hour }: AnalysisContext): Analysis {
  const p = resolveProfile(food);
  const has = (flag: Flag) => p.flags.has(flag);
  const isDrink = DRINK_CATEGORIES.includes(food.category);
  const sensitive = (id: Profile['sensitivities'][number]) => profile.sensitivities.includes(id);
  const containsDairy = food.allergens.includes('dairy');
  const containsGluten = food.allergens.includes('gluten');
  const quickSugar = p.sugar === 'high' || has('sugaryDrink') || (has('refinedCarbs') && p.fiber === 'low');
  const heavy = has('fried') || p.satFat === 'high' || has('creamy');
  const vegetarianUser = ['vegetarian', 'vegan', 'jain'].includes(profile.diet);

  // Score: start neutral, reward what feeds the gut, penalise what harms it.
  let score = 6;
  if (!isDrink) score += FIBER_SCORE[p.fiber];
  for (const flag of p.flags) score += FLAG_SCORE[flag] ?? 0;
  if (has('leanProtein') && p.protein === 'high') score += 0.5;
  score -= SUGAR_PENALTY[p.sugar] + SAT_FAT_PENALTY[p.satFat] + (p.sodium === 'high' ? 0.5 : 0);
  if (sensitive('lactose') && containsDairy) score -= has('fermented') ? 0.5 : 1.5;
  if (sensitive('gluten') && containsGluten) score -= 2;
  if (sensitive('ibs') && (has('legumes') || containsGluten)) score -= 1;
  if (sensitive('reflux') && (heavy || has('spicy') || has('caffeine') || has('alcohol'))) score -= 1;
  if (sensitive('blood-sugar') && quickSugar) score -= 1;
  if (sensitive('blood-pressure') && p.sodium === 'high') score -= 1;
  if (food.category === 'water') score = 10;
  score = Math.min(10, Math.max(1, Math.round(score)));
  const verdict = verdictForScore(score);
  const healthy = score >= 7;

  // Effects on the gut.
  const gutBad: GutEffectId[] = [];
  if (has('processedMeat')) gutBad.push('processed_meat');
  if (has('fried')) gutBad.push('fried');
  if (has('sugaryDrink')) gutBad.push('sugary_drink');
  if (has('alcohol')) gutBad.push('alcohol');
  if (p.sugar === 'high' && !has('sugaryDrink')) gutBad.push('sugar_high');
  if (has('ultraProcessed')) gutBad.push('ultra_processed');
  if (has('refinedCarbs') && p.fiber !== 'high') gutBad.push('refined_carbs');
  else if (p.fiber === 'low' && !isDrink) gutBad.push('fiber_low');
  if (has('redMeat')) gutBad.push('red_meat');
  if (has('creamy')) gutBad.push('creamy');
  const gutMixed: GutEffectId[] = [];
  if (has('spicy')) gutMixed.push('spicy');
  if (has('caffeine')) gutMixed.push('caffeine');
  const gutGood: GutEffectId[] = [];
  if (has('fermented')) gutGood.push('fermented');
  if (p.fiber === 'high') gutGood.push('fiber_high');
  if (has('legumes')) gutGood.push('legumes');
  if (has('wholeGrains')) gutGood.push('whole_grains');
  if (has('vegetables')) gutGood.push('vegetables');
  if (has('fruit')) gutGood.push('fruit');
  if (has('nutsSeeds')) gutGood.push('nuts_seeds');
  if (has('oilyFish')) gutGood.push('oily_fish');
  const gut = mergeEffects(gutGood, gutBad, gutMixed, healthy, 4);
  if (!gut.length) gut.push({ id: 'light', effect: 'good' });

  // Effects on the rest of the body.
  const bodyBad: BodyEffectId[] = [];
  if (quickSugar) bodyBad.push('blood_sugar');
  if (p.sodium === 'high') bodyBad.push('salt_high');
  if (p.satFat === 'high') bodyBad.push('sat_fat_high');
  if (has('alcohol')) bodyBad.push('alcohol');
  if (has('fried') || p.kcal[1] >= 750) bodyBad.push('calorie_dense');
  const bodyMixed: BodyEffectId[] = has('caffeine') ? ['caffeine'] : [];
  const bodyGood: BodyEffectId[] = [];
  if (p.protein === 'high') bodyGood.push('protein_good');
  if (p.fiber === 'high') bodyGood.push('fiber_full');
  if (has('oilyFish') || has('nutsSeeds')) bodyGood.push('heart_fats');
  if (has('vegetables') || has('fruit')) bodyGood.push('vitamins');
  if (['water', 'coconut_water', 'tea'].includes(food.category)) bodyGood.push('hydrating');
  const body = mergeEffects(bodyGood, bodyBad, bodyMixed, healthy, 4);

  // Diseases linked to eating this often. Only for foods worth warning about.
  const risks = new Set<RiskId>();
  if (score <= 6) {
    if (has('processedMeat')) risks.add('colorectal_cancer').add('heart_disease');
    if (has('alcohol')) risks.add('liver_disease').add('alcohol_cancers');
    if (p.sugar === 'high' || has('sugaryDrink')) risks.add('type2_diabetes').add('tooth_decay');
    if (has('sugaryDrink')) risks.add('fatty_liver');
    if (has('redMeat')) risks.add('colorectal_cancer');
    if (p.satFat === 'high') risks.add('high_cholesterol').add('heart_disease');
    if (p.sodium === 'high') risks.add('hypertension').add('stroke');
    if (has('fried')) risks.add('heart_disease').add('obesity');
    if (has('refinedCarbs') && p.fiber === 'low') risks.add('type2_diabetes');
    if (has('ultraProcessed') || p.kcal[1] >= 750) risks.add('obesity');
    if (p.fiber === 'low' && !isDrink && score <= 4) risks.add('constipation');
  }
  if (has('caffeine')) risks.add('sleep');

  // What to avoid at the next meal, and what to have instead.
  const plantFirst = vegetarianUser || food.diet === 'vegan' || food.diet === 'veg';
  const avoid: Analysis['avoid'] = [];
  const addAvoid = (id: AvoidId, timeframe: Timeframe, instead: InsteadId) => {
    if (!avoid.some((item) => item.id === id)) avoid.push({ id, timeframe, instead });
  };
  if (has('fried') || p.satFat === 'high') addAvoid('fried', 'rest of today', plantFirst ? 'lentils_greens' : 'grilled_meat');
  if (p.sugar === 'high' || has('sugaryDrink')) addAvoid('sugary', 'rest of today', 'water');
  if (has('refinedCarbs') && p.fiber === 'low') addAvoid('refined_carbs', 'next meal', 'whole_grains');
  if (has('processedMeat')) addAvoid('processed_meat', 'next few days', plantFirst ? 'plant_protein' : 'lean_protein');
  if (has('redMeat')) addAvoid('red_meat', 'next few days', plantFirst ? 'plant_protein' : 'lean_protein');
  if (p.sodium === 'high') addAvoid('salty', 'rest of today', 'fruit_nuts');
  if (has('alcohol')) addAvoid('alcohol', 'rest of today', 'sparkling');
  if (has('caffeine')) addAvoid('caffeine', 'rest of today', 'herbal');
  if (has('spicy') || (sensitive('reflux') && heavy)) addAvoid('spicy', 'next meal', 'mild');
  if (has('creamy') && !avoid.some((item) => item.id === 'fried')) addAvoid('heavy', 'next meal', 'light_meal');
  if (sensitive('lactose') && containsDairy) addAvoid('dairy', 'rest of today', 'lactose_free');
  if (hour >= 15 && hour < 21 && p.kcal[1] >= 650) addAvoid('late_heavy', 'rest of today', 'early_light');
  if (avoid.length < 3) addAvoid('ultra_processed', 'next meal', 'home_cooked');
  if (avoid.length < 3) addAvoid('sugary', 'rest of today', 'fruit_nuts');
  if (avoid.length < 3) addAvoid('fried', 'next meal', plantFirst ? 'lentils_greens' : 'grilled_meat');

  // Good foods for the next meal, based on what this one lacked.
  const eat: EatId[] = [];
  if (healthy) eat.push('more_of_this');
  if (p.fiber !== 'high') eat.push('greens');
  if (!has('legumes')) eat.push('legumes');
  if (!has('fermented')) eat.push(profile.diet === 'vegan' || sensitive('lactose') ? 'fermented' : 'yogurt');
  if (quickSugar) eat.push('nuts');
  if (p.sodium === 'high') eat.push('water');
  if (p.protein === 'low') {
    eat.push(profile.diet === 'vegan' ? 'protein_vegan' : vegetarianUser || profile.diet === 'eggetarian' ? 'protein_veg' : 'protein_meat');
  }
  if (has('refinedCarbs')) eat.push('whole_grains');
  eat.push('fruit');

  return {
    score,
    verdict,
    summary: summarize(score, p, has, isDrink),
    gut,
    body,
    risks: [...risks].slice(0, 4),
    avoid: avoid.slice(0, 5),
    eat: [...new Set(eat)].slice(0, 4),
    swaps: food.category,
    watch: watchOuts(food, profile, p, has, quickSugar, heavy),
    nutrition: { fiber: p.fiber, sugar: p.sugar, sodium: p.sodium, satFat: p.satFat, protein: p.protein, kcal: p.kcal },
  };
}

function mergeEffects<T extends string>(good: T[], bad: T[], mixed: T[], healthy: boolean, max: number) {
  const goods = good.map((id) => ({ id, effect: 'good' as Effect }));
  const bads = bad.map((id) => ({ id, effect: 'bad' as Effect }));
  const mixeds = mixed.map((id) => ({ id, effect: 'mixed' as Effect }));
  const [first, second] = healthy ? [goods, bads] : [bads, goods];
  // Lead with what dominates, but keep at least one of the other side when it exists.
  const picked = [...first.slice(0, max - (second.length ? 1 : 0)), ...second.slice(0, 1), ...mixeds];
  const rest = [...first, ...second].filter((item) => !picked.includes(item));
  return [...picked, ...rest].slice(0, max);
}

function summarize(
  score: number,
  p: ReturnType<typeof resolveProfile>,
  has: (flag: Flag) => boolean,
  isDrink: boolean,
): Analysis['summary'] {
  const good: FactorId[] = [];
  if (has('fermented')) good.push('fermented');
  if (p.fiber === 'high') good.push('fiber_high');
  if (has('legumes')) good.push('legumes');
  if (has('wholeGrains')) good.push('whole_grains');
  if (has('vegetables')) good.push('vegetables');
  if (has('fruit')) good.push('fruit');
  if (has('oilyFish')) good.push('oily_fish');
  if (has('nutsSeeds')) good.push('nuts_seeds');
  if (has('leanProtein') && p.protein === 'high') good.push('lean_protein');

  const bad: FactorId[] = [];
  if (has('processedMeat')) bad.push('processed_meat');
  if (has('fried')) bad.push('fried');
  if (has('sugaryDrink')) bad.push('sugary_drink');
  if (has('alcohol')) bad.push('alcohol');
  if (p.sugar === 'high' && !has('sugaryDrink')) bad.push('sugar_high');
  if (has('ultraProcessed')) bad.push('ultra_processed');
  if (has('refinedCarbs')) bad.push('refined_carbs');
  if (p.satFat === 'high') bad.push('sat_fat_high');
  if (p.sodium === 'high') bad.push('sodium_high');
  if (p.fiber === 'low' && !isDrink) bad.push('fiber_low');

  const top = { good: good.slice(0, 2), bad: bad.slice(0, 2) };
  if (score >= 7 && top.good.length) return { kind: 'good', ...top };
  if (score <= 4 && top.bad.length) return { kind: 'bad', ...top };
  if (top.good.length && top.bad.length) return { kind: 'mixed', ...top };
  return { kind: 'neutral', ...top };
}

const DIET_CONFLICTS: Record<DietId, FoodDiet[]> = {
  any: [],
  vegetarian: ['egg', 'fish', 'meat'],
  eggetarian: ['fish', 'meat'],
  vegan: ['veg', 'egg', 'fish', 'meat'],
  pescatarian: ['meat'],
  jain: ['egg', 'fish', 'meat'],
};

const JAIN_CHECK: CategoryId[] = [
  'curry_veg', 'curry_creamy', 'legumes', 'chaat', 'fried_snack', 'rice_dish', 'stuffed_bread', 'veg_dish',
  'soup_veg', 'mixed_plate', 'mixed', 'pizza', 'sandwich', 'noodles', 'fried_rice', 'dumplings',
];

function watchOuts(
  food: Food,
  profile: Profile,
  p: ReturnType<typeof resolveProfile>,
  has: (flag: Flag) => boolean,
  quickSugar: boolean,
  heavy: boolean,
): WatchOut[] {
  const watch: WatchOut[] = [];
  const sensitive = (id: Profile['sensitivities'][number]) => profile.sensitivities.includes(id);

  if (sensitive('nuts') && food.allergens.includes('nuts')) watch.push({ kind: 'note', key: 'nutAllergy' });
  if (food.diet && DIET_CONFLICTS[profile.diet].includes(food.diet)) {
    // Conflicts never include 'vegan', so only these remain.
    const what = food.diet === 'veg' ? 'dairy' : (food.diet as 'egg' | 'fish' | 'meat');
    watch.push({ kind: 'dietConflict', what, diet: profile.diet });
  } else if (!food.diet && profile.diet !== 'any' && profile.diet !== 'pescatarian') {
    watch.push({ kind: 'note', key: 'dietVaries' });
  }
  if (profile.diet === 'jain' && (has('rootVeg') || JAIN_CHECK.includes(food.category))) {
    watch.push({ kind: 'note', key: 'jain' });
  }
  if (sensitive('lactose') && food.allergens.includes('dairy')) watch.push({ kind: 'note', key: 'lactose' });
  if (sensitive('gluten') && food.allergens.includes('gluten')) watch.push({ kind: 'note', key: 'gluten' });
  if (sensitive('ibs') && (has('legumes') || food.allergens.includes('gluten'))) watch.push({ kind: 'note', key: 'ibs' });
  if (sensitive('reflux') && (heavy || has('spicy') || has('caffeine') || has('alcohol'))) {
    watch.push({ kind: 'note', key: 'reflux' });
  }
  if (sensitive('blood-sugar') && quickSugar) watch.push({ kind: 'note', key: 'bloodSugar' });
  if (sensitive('blood-pressure') && p.sodium === 'high') watch.push({ kind: 'note', key: 'bloodPressure' });
  if (food.allergens.length) watch.push({ kind: 'allergens', allergens: food.allergens });
  return watch;
}
