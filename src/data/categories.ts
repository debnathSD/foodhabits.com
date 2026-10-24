/**
 * Nutrition and gut-health profile of each food category. Every food the app
 * knows (the model's 2,023 dishes and the typed-search catalog) points at one
 * of these; src/data/food-tweaks.ts adjusts individual dishes.
 *
 * Levels describe a typical serving. They are deliberately coarse: the app
 * explains what a food is heavy or light in, it does not count grams.
 */

export type Level = 'low' | 'medium' | 'high';

export type Flag =
  | 'fried'
  | 'refinedCarbs'
  | 'wholeGrains'
  | 'processedMeat'
  | 'redMeat'
  | 'leanProtein'
  | 'ultraProcessed'
  | 'fermented'
  | 'vegetables'
  | 'legumes'
  | 'fruit'
  | 'nutsSeeds'
  | 'oilyFish'
  | 'spicy'
  | 'creamy'
  | 'sugaryDrink'
  | 'alcohol'
  | 'caffeine'
  | 'rootVeg';

/** The most restrictive diet a dish is compatible with. */
export type FoodDiet = 'vegan' | 'veg' | 'egg' | 'fish' | 'meat';

export type Allergen = 'gluten' | 'dairy' | 'egg' | 'nuts' | 'sesame' | 'soy' | 'fish' | 'shellfish';

export type CategoryProfile = {
  fiber: Level;
  sugar: Level;
  sodium: Level;
  satFat: Level;
  protein: Level;
  /** Typical calories for one serving. */
  kcal: [number, number];
  flags: Flag[];
  /** Used when the dish name doesn't tell us; null means "varies, check". */
  diet: FoodDiet | null;
  allergens: Allergen[];
};

function profile(
  [fiber, sugar, sodium, satFat, protein]: [Level, Level, Level, Level, Level],
  kcal: [number, number],
  flags: Flag[],
  diet: FoodDiet | null,
  allergens: Allergen[] = [],
): CategoryProfile {
  return { fiber, sugar, sodium, satFat, protein, kcal, flags, diet, allergens };
}

const L = 'low' as const;
const M = 'medium' as const;
const H = 'high' as const;

export const CATEGORIES = {
  // Breads and grains
  bread: profile([L, L, M, L, L], [150, 300], ['refinedCarbs'], 'veg', ['gluten']),
  wholegrain_bread: profile([H, L, L, L, M], [120, 250], ['wholeGrains'], 'vegan', ['gluten']),
  fried_bread: profile([L, L, M, M, L], [250, 450], ['fried', 'refinedCarbs'], 'vegan', ['gluten']),
  stuffed_bread: profile([M, L, M, M, M], [300, 500], ['refinedCarbs'], 'veg', ['gluten', 'dairy']),
  savory_pastry: profile([L, L, H, H, M], [350, 600], ['refinedCarbs', 'creamy'], null, ['gluten', 'dairy']),
  rice_plain: profile([L, L, L, L, L], [200, 300], ['refinedCarbs'], 'vegan'),
  rice_dish: profile([L, L, M, M, M], [450, 750], ['refinedCarbs'], null),
  fried_rice: profile([L, L, H, M, M], [500, 800], ['refinedCarbs'], 'egg', ['egg', 'soy']),
  porridge: profile([L, L, L, L, L], [200, 400], ['refinedCarbs'], 'vegan'),
  oats_cereal: profile([H, M, L, L, M], [250, 400], ['wholeGrains'], 'veg', ['gluten']),
  noodle_soup: profile([L, L, H, M, M], [450, 700], ['refinedCarbs'], null, ['gluten', 'soy']),
  noodles: profile([L, M, H, M, M], [500, 800], ['refinedCarbs'], 'egg', ['gluten', 'soy', 'egg']),
  pasta: profile([M, M, M, L, M], [450, 700], ['refinedCarbs', 'vegetables'], 'veg', ['gluten']),
  creamy_pasta: profile([L, L, H, H, M], [650, 950], ['refinedCarbs', 'creamy'], 'veg', ['gluten', 'dairy']),
  dumplings: profile([L, L, H, M, M], [350, 550], ['refinedCarbs'], null, ['gluten', 'soy']),
  fermented_batter: profile([M, L, M, L, M], [200, 400], ['fermented', 'legumes'], 'vegan'),

  // Fast food and street food
  pizza: profile([L, M, H, H, M], [600, 900], ['refinedCarbs', 'creamy'], 'veg', ['gluten', 'dairy']),
  burger: profile([L, M, H, H, H], [550, 900], ['refinedCarbs', 'redMeat', 'ultraProcessed'], 'meat', ['gluten', 'dairy', 'egg']),
  sandwich: profile([L, L, H, M, M], [350, 600], ['refinedCarbs'], null, ['gluten']),
  hot_dog: profile([L, M, H, H, M], [300, 550], ['refinedCarbs', 'processedMeat', 'ultraProcessed'], 'meat', ['gluten']),
  taco_burrito: profile([M, L, H, M, H], [450, 850], ['legumes'], 'meat', ['gluten', 'dairy']),
  fries: profile([L, L, H, M, L], [350, 550], ['fried', 'rootVeg'], 'vegan'),
  potato: profile([M, L, M, M, L], [250, 450], ['rootVeg'], 'veg', ['dairy']),
  fried_snack: profile([L, L, H, M, L], [250, 450], ['fried', 'refinedCarbs'], 'veg', ['gluten']),
  chaat: profile([M, M, H, M, M], [300, 500], ['fried', 'legumes', 'spicy', 'rootVeg'], 'veg', ['gluten', 'dairy']),

  // Meat, fish, eggs
  fried_meat: profile([L, L, H, H, H], [500, 800], ['fried', 'refinedCarbs'], 'meat', ['gluten', 'egg']),
  fried_seafood: profile([L, L, H, M, H], [450, 750], ['fried', 'refinedCarbs'], 'fish', ['gluten', 'fish']),
  grilled_meat: profile([L, L, M, M, H], [300, 500], ['leanProtein'], 'meat'),
  red_meat: profile([L, L, M, H, H], [450, 750], ['redMeat'], 'meat'),
  processed_meat: profile([L, L, H, H, H], [300, 550], ['processedMeat', 'ultraProcessed'], 'meat'),
  stir_fry: profile([M, M, H, M, H], [400, 650], ['vegetables', 'spicy'], 'meat', ['soy']),
  meat_stew: profile([M, L, H, M, H], [400, 650], ['vegetables'], 'meat'),
  curry_meat: profile([M, L, M, M, H], [400, 650], ['spicy'], 'meat'),
  curry_creamy: profile([L, M, M, H, H], [500, 800], ['creamy'], 'meat', ['dairy', 'nuts']),
  curry_veg: profile([H, L, M, L, M], [200, 400], ['vegetables', 'spicy'], 'vegan'),
  legumes: profile([H, L, M, L, H], [250, 450], ['legumes'], 'vegan'),
  tofu_soy: profile([M, L, M, L, H], [200, 400], ['leanProtein'], 'vegan', ['soy']),
  fish: profile([L, L, M, L, H], [250, 450], ['leanProtein', 'oilyFish'], 'fish', ['fish']),
  // Bengali-style jhol, jhal and kalia: fish in a mustard-oil gravy.
  fish_curry: profile([L, L, M, L, H], [280, 450], ['leanProtein', 'spicy'], 'fish', ['fish']),
  seafood: profile([L, L, M, L, H], [250, 450], ['leanProtein'], 'fish', ['shellfish']),
  raw_fish: profile([L, L, M, L, H], [300, 500], ['leanProtein', 'oilyFish', 'refinedCarbs'], 'fish', ['fish', 'soy']),
  egg_dish: profile([L, L, M, M, H], [250, 450], ['leanProtein'], 'egg', ['egg']),

  // Vegetables, salads, soups
  salad: profile([H, L, L, L, L], [100, 300], ['vegetables'], 'vegan'),
  creamy_salad: profile([L, M, M, H, L], [300, 500], ['creamy'], 'egg', ['egg']),
  veg_dish: profile([H, L, M, L, L], [150, 350], ['vegetables'], 'vegan'),
  fried_veg: profile([M, L, M, M, L], [250, 450], ['fried', 'vegetables'], 'vegan', ['gluten']),
  soup_clear: profile([L, L, H, L, M], [80, 250], [], null),
  soup_creamy: profile([L, L, H, H, M], [300, 500], ['creamy'], 'veg', ['dairy']),
  soup_veg: profile([H, L, M, L, L], [120, 300], ['vegetables'], 'vegan'),
  fermented_veg: profile([M, L, H, L, L], [20, 80], ['fermented', 'vegetables'], 'vegan'),

  // Rich, dairy and cheese
  casserole: profile([L, L, H, H, M], [450, 700], ['creamy'], 'veg', ['dairy', 'gluten']),
  cheese_dish: profile([L, L, H, H, H], [400, 700], ['creamy'], 'veg', ['dairy']),
  yogurt: profile([L, L, L, M, M], [100, 200], ['fermented'], 'veg', ['dairy']),
  // Mishti doi and other sweetened, set yogurts: live cultures, but a lot of sugar.
  sweet_yogurt: profile([L, H, L, M, M], [150, 260], ['fermented'], 'veg', ['dairy']),

  // Desserts and sweets
  cake_pastry: profile([L, H, M, H, L], [300, 500], ['refinedCarbs', 'ultraProcessed'], 'egg', ['gluten', 'dairy', 'egg']),
  fried_sweet: profile([L, H, L, H, L], [250, 450], ['fried', 'refinedCarbs'], 'veg', ['gluten', 'dairy']),
  milk_sweet: profile([L, H, L, M, M], [250, 400], [], 'veg', ['dairy', 'nuts']),
  frozen_dessert: profile([L, H, L, H, L], [250, 450], ['ultraProcessed'], 'veg', ['dairy']),
  sweets_candy: profile([L, H, L, M, L], [200, 400], ['ultraProcessed'], 'veg', ['dairy', 'nuts']),
  steamed_sweet: profile([L, H, L, L, L], [150, 300], ['refinedCarbs'], 'vegan'),
  pancake_waffle: profile([L, H, M, M, M], [400, 650], ['refinedCarbs'], 'egg', ['gluten', 'dairy', 'egg']),
  breakfast_plate: profile([L, L, H, H, H], [700, 1100], ['processedMeat', 'fried', 'refinedCarbs'], 'meat', ['gluten', 'egg']),
  fruit_dessert: profile([M, H, L, M, L], [250, 400], ['fruit'], 'veg', ['gluten', 'dairy']),

  // Whole foods and the rest
  fruit: profile([H, M, L, L, L], [60, 150], ['fruit'], 'vegan'),
  nuts_seeds: profile([H, L, L, M, H], [160, 300], ['nutsSeeds'], 'vegan', ['nuts']),
  dips: profile([M, L, M, M, L], [80, 200], [], 'vegan'),
  // Cooked sweet-sour chutneys (tomato-khejur, aam, plastic): small portion, mostly sugar.
  chutney: profile([L, H, M, L, L], [60, 150], [], 'vegan'),
  mixed_plate: profile([M, L, M, M, M], [550, 900], ['vegetables'], null),
  mixed: profile([M, M, M, M, M], [350, 650], [], null),

  // Drinks (typed search only; the photo model only knows dishes)
  soda: profile([L, H, L, L, L], [140, 220], ['sugaryDrink', 'ultraProcessed'], 'vegan'),
  juice: profile([L, H, L, L, L], [110, 180], ['sugaryDrink', 'fruit'], 'vegan'),
  smoothie: profile([M, M, L, L, M], [180, 350], ['fruit'], 'veg', ['dairy']),
  coffee: profile([L, L, L, L, L], [5, 20], ['caffeine'], 'vegan'),
  milk_coffee: profile([L, M, L, M, M], [100, 250], ['caffeine'], 'veg', ['dairy']),
  tea: profile([L, L, L, L, L], [0, 10], ['caffeine'], 'vegan'),
  milk_tea: profile([L, M, L, M, L], [80, 160], ['caffeine'], 'veg', ['dairy']),
  milkshake: profile([L, H, L, H, M], [350, 600], ['ultraProcessed'], 'veg', ['dairy']),
  alcohol: profile([L, M, L, L, L], [100, 250], ['alcohol'], 'vegan', ['gluten']),
  kombucha: profile([L, M, L, L, L], [30, 80], ['fermented'], 'vegan'),
  water: profile([L, L, L, L, L], [0, 0], [], 'vegan'),
  coconut_water: profile([L, M, L, L, L], [40, 70], [], 'vegan'),
} satisfies Record<string, CategoryProfile>;

export type CategoryId = keyof typeof CATEGORIES;

export const DRINK_CATEGORIES: CategoryId[] = [
  'soda', 'juice', 'smoothie', 'coffee', 'milk_coffee', 'tea', 'milk_tea', 'milkshake', 'alcohol',
  'kombucha', 'water', 'coconut_water',
];
