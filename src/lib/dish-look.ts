/**
 * What a dish looks like in the explainer when there is no photo of it: one of
 * the 3D models in src/three/dish-models.tsx, coloured and topped for this
 * dish. The food type picks the model (a curry is a bowl, biryani a rice
 * plate, chai a clay cup); the dish's name picks the colours and what is in it
 * (palak is green, shorshe is mustard yellow, chole has chickpeas). Pure and
 * serializable, so it crosses into the video's web view.
 */
import type { CategoryId } from '../data/categories';
import { DISH_LOOKS, SIDES } from '../data/dish-looks';

export type DishModelKind =
  | 'bowl' | 'claypot' | 'rice' | 'flatbread' | 'puffed' | 'crepe' | 'steamed' | 'squares'
  | 'pizza' | 'burger' | 'sandwich' | 'hotdog' | 'taco' | 'wrap' | 'fries' | 'snacks' | 'chaat'
  | 'drumsticks' | 'steak' | 'skewer' | 'sausages' | 'fillet' | 'prawns' | 'sushi' | 'egg'
  | 'salad' | 'noodles' | 'dumplings' | 'balls' | 'spiral' | 'cake' | 'icecream' | 'pancakes'
  | 'pie' | 'fruit' | 'nuts' | 'thali' | 'veg' | 'casserole' | 'cookies' | 'candy'
  | 'glass' | 'cup' | 'kulhad' | 'wine' | 'beer' | 'coconut'
  | 'paturi' | 'cone' | 'pav' | 'riceCurry' | 'tumbler';

/** What sits in a bowl or on a plate. */
export type Topping =
  | 'chunks' | 'darkChunks' | 'fish' | 'prawns' | 'egg' | 'cubes' | 'chickpeas' | 'beans'
  | 'potato' | 'peas' | 'florets' | 'veg' | 'noodles' | 'flakes' | 'nuts' | 'kofta' | 'pakoras'
  | 'okra' | 'greens' | 'rice' | 'muri' | 'biryani' | 'coconut' | 'mango' | 'gourd' | 'diamonds' | 'none';

export type Garnish = 'herbs' | 'cream' | 'tadka' | 'onions' | 'chilies';

/** A small bowl served alongside: sambar with dosa, alur dom with luchi, kasundi with fish fry. */
export type Side = { color: string; topping?: Topping };

export type DishLook = {
  model: DishModelKind;
  /** The main colour: gravy, dough, batter, drink. */
  base: string;
  /** The second colour: crust, sauce, filling, garnish. */
  accent: string;
  topping: Topping;
  /** A second thing in it: the potato in macher jhol, the egg in dimer dalna. */
  extra?: Topping;
  /** A model's variant, e.g. the shape of fried snacks or how an egg is cooked. */
  shape?: string;
  /** What goes on top: coriander, cream, a tadka, fried onions, slit green chillies. */
  garnish?: Garnish[];
  sides?: Side[];
};


const LOOKS: Record<CategoryId, Omit<DishLook, 'topping'> & { topping?: Topping }> = {
  bread: { model: 'flatbread', base: '#E9C98F', accent: '#8A5A2B' },
  wholegrain_bread: { model: 'flatbread', base: '#C99A5B', accent: '#6E4320' },
  fried_bread: { model: 'puffed', base: '#EBC27A', accent: '#C08A3E', sides: [SIDES.alurDom] },
  stuffed_bread: { model: 'flatbread', base: '#D9A55A', accent: '#7A4A1E', shape: 'thick' },
  savory_pastry: { model: 'snacks', base: '#D99A45', accent: '#9C6324', shape: 'triangle', sides: [SIDES.greenChutney] },
  rice_plain: { model: 'rice', base: '#F4EFE2', accent: '#E8DFC8' },
  rice_dish: { model: 'rice', base: '#F1D27A', accent: '#E27A2C', topping: 'chunks', garnish: ['herbs'] },
  fried_rice: { model: 'rice', base: '#E9C77A', accent: '#6A9E3A', topping: 'veg' },
  porridge: { model: 'bowl', base: '#E8C46A', accent: '#C9963A', garnish: ['herbs'] },
  oats_cereal: { model: 'bowl', base: '#EFE6D2', accent: '#C9A36A', topping: 'flakes' },
  noodle_soup: { model: 'bowl', base: '#D9A85A', accent: '#F2D88A', topping: 'noodles', garnish: ['herbs'] },
  noodles: { model: 'noodles', base: '#E7C26A', accent: '#6A9E3A' },
  pasta: { model: 'noodles', base: '#EBCB7A', accent: '#C0392B', shape: 'sauce' },
  creamy_pasta: { model: 'noodles', base: '#EBCB7A', accent: '#F1E6C8', shape: 'sauce' },
  dumplings: { model: 'dumplings', base: '#F2EBDD', accent: '#C8B48A' },
  fermented_batter: { model: 'crepe', base: '#DDA352', accent: '#8C5A26', sides: [SIDES.sambar, SIDES.coconutChutney] },
  pizza: { model: 'pizza', base: '#E3B062', accent: '#C0392B' },
  burger: { model: 'burger', base: '#D99A4E', accent: '#5A3420' },
  sandwich: { model: 'sandwich', base: '#EAD2A0', accent: '#6FAE4E' },
  hot_dog: { model: 'hotdog', base: '#DDA25A', accent: '#A8432A' },
  taco_burrito: { model: 'taco', base: '#E8C060', accent: '#7A4A2A' },
  fries: { model: 'fries', base: '#F2C14E', accent: '#C0392B' },
  potato: { model: 'veg', base: '#E9CF7A', accent: '#C9A04A', topping: 'potato', garnish: ['herbs'] },
  fried_snack: { model: 'snacks', base: '#D8913C', accent: '#9C5A1E', shape: 'blob', sides: [SIDES.greenChutney] },
  chaat: { model: 'chaat', base: '#E3B05A', accent: '#F3EEDC' },
  fried_meat: { model: 'drumsticks', base: '#C97C34', accent: '#8A4A1A' },
  fried_seafood: { model: 'fillet', base: '#D9A04A', accent: '#F2D16B', shape: 'battered' },
  grilled_meat: { model: 'skewer', base: '#C2552E', accent: '#6FAE4E' },
  red_meat: { model: 'steak', base: '#7A3B22', accent: '#3A1A0E' },
  processed_meat: { model: 'sausages', base: '#9A4A2C', accent: '#5A2A18', sides: [{ color: '#F2C230' }] },
  stir_fry: { model: 'veg', base: '#6FAE4E', accent: '#E07A2E', topping: 'chunks' },
  meat_stew: { model: 'bowl', base: '#7A4426', accent: '#4E2A16', topping: 'darkChunks', garnish: ['herbs'] },
  curry_meat: { model: 'bowl', base: '#B5521F', accent: '#7A3214', topping: 'chunks', garnish: ['herbs'] },
  curry_creamy: { model: 'bowl', base: '#DB7A34', accent: '#F3E1C0', topping: 'cubes', garnish: ['cream'] },
  curry_veg: { model: 'bowl', base: '#C88A2E', accent: '#6FAE4E', topping: 'veg', garnish: ['herbs'] },
  legumes: { model: 'bowl', base: '#E3B13A', accent: '#B8862A', garnish: ['herbs'] },
  tofu_soy: { model: 'veg', base: '#6FAE4E', accent: '#F1E9D2', topping: 'cubes' },
  fish: { model: 'fillet', base: '#E2A85C', accent: '#F2E45C' },
  fish_curry: { model: 'bowl', base: '#D99A2B', accent: '#9C5A1E', topping: 'fish', garnish: ['herbs'] },
  seafood: { model: 'prawns', base: '#EE8A5A', accent: '#F4D3B0' },
  raw_fish: { model: 'sushi', base: '#F07A4A', accent: '#1F2A22' },
  egg_dish: { model: 'egg', base: '#FBF7EE', accent: '#F2B41D', shape: 'fried' },
  salad: { model: 'salad', base: '#6FAE4E', accent: '#D7402E' },
  creamy_salad: { model: 'salad', base: '#8CBF5A', accent: '#F1E9D2', shape: 'creamy' },
  veg_dish: { model: 'veg', base: '#6E9E3A', accent: '#E0A33A', topping: 'veg' },
  fried_veg: { model: 'snacks', base: '#C9873A', accent: '#6E3A6E', shape: 'slice' },
  soup_clear: { model: 'bowl', base: '#D9B26A', accent: '#6FAE4E', topping: 'veg', shape: 'clear' },
  soup_creamy: { model: 'bowl', base: '#E8C98A', accent: '#F6EEDC', garnish: ['cream'] },
  soup_veg: { model: 'bowl', base: '#C9762E', accent: '#6FAE4E', topping: 'veg', garnish: ['herbs'] },
  fermented_veg: { model: 'bowl', base: '#C8452E', accent: '#E8D9B0', topping: 'veg', shape: 'small' },
  casserole: { model: 'casserole', base: '#E2A34A', accent: '#B5442A' },
  cheese_dish: { model: 'squares', base: '#F2D27A', accent: '#E0B04A', shape: 'cheese' },
  yogurt: { model: 'bowl', base: '#F6F2E8', accent: '#E8E0CC' },
  sweet_yogurt: { model: 'claypot', base: '#E9C48E', accent: '#B9783A' },
  cake_pastry: { model: 'cake', base: '#E9C99A', accent: '#F6F0E6' },
  fried_sweet: { model: 'balls', base: '#7A3A1C', accent: '#E9A94A' },
  milk_sweet: { model: 'squares', base: '#F3E6C8', accent: '#9CB86A' },
  frozen_dessert: { model: 'icecream', base: '#F4E7C8', accent: '#C98A5A' },
  sweets_candy: { model: 'candy', base: '#5B3420', accent: '#C9302C' },
  steamed_sweet: { model: 'dumplings', base: '#F4EEE0', accent: '#B9783A' },
  pancake_waffle: { model: 'pancakes', base: '#DDA352', accent: '#8A4A1A' },
  breakfast_plate: { model: 'thali', base: '#F2B41D', accent: '#9A4A2C', shape: 'breakfast' },
  fruit_dessert: { model: 'pie', base: '#D9A04A', accent: '#B5442A' },
  fruit: { model: 'fruit', base: '#D7402E', accent: '#F28C28' },
  nuts_seeds: { model: 'nuts', base: '#B9824A', accent: '#E9D3A6' },
  dips: { model: 'bowl', base: '#D9B87A', accent: '#7A9E3A', shape: 'small' },
  chutney: { model: 'bowl', base: '#6FAE4E', accent: '#C9302C', shape: 'small' },
  mixed_plate: { model: 'thali', base: '#F4EFE2', accent: '#E3B13A' },
  mixed: { model: 'thali', base: '#F4EFE2', accent: '#E3B13A' },
  soda: { model: 'glass', base: '#3B1F12', accent: '#E9E2D6', shape: 'fizzy' },
  juice: { model: 'glass', base: '#F28C28', accent: '#F6D36B' },
  smoothie: { model: 'glass', base: '#D9607A', accent: '#F4E7C8', shape: 'straw' },
  coffee: { model: 'cup', base: '#3A2216', accent: '#6E4630' },
  milk_coffee: { model: 'cup', base: '#B98A5E', accent: '#F1E3CC', shape: 'latte' },
  tea: { model: 'cup', base: '#B5651D', accent: '#E3A04A' },
  milk_tea: { model: 'kulhad', base: '#C9965E', accent: '#E9D3B0' },
  milkshake: { model: 'glass', base: '#E9C9A0', accent: '#FBF7EE', shape: 'shake' },
  alcohol: { model: 'glass', base: '#C98A2E', accent: '#F4E7C8', shape: 'spirit' },
  kombucha: { model: 'glass', base: '#C9902E', accent: '#F2E1B0', shape: 'fizzy' },
  water: { model: 'glass', base: '#CFE8F2', accent: '#FFFFFF', shape: 'water' },
  coconut_water: { model: 'coconut', base: '#5E7A2E', accent: '#F4EFE2' },
};

type Patch = Partial<DishLook>;
/** First match wins within each list. Names are lowercase. */
type Rule = [RegExp, Patch];

/** Dishes whose name says which model fits better than their food type does. */
const MODEL_RULES: Rule[] = [
  [/dosa|dosai|uttapam|appam/, { model: 'crepe' }],
  [/fish and chips|fish n chips/, { model: 'fillet', shape: 'battered' }],
  [/\bpie\b|tart\b|crumble/, { model: 'pie' }],
  [/lasagn|moussaka|gratin|bake\b/, { model: 'casserole' }],
  [/idli|idly/, { model: 'steamed', base: '#F6F2E6', accent: '#F1F1E6' }],
  [/dhokla|khandvi|barfi|burfi|kalakand|sandesh|shondesh|sondesh|peda/, { model: 'squares' }],
  [/samosa|singara|shingara|puff/, { model: 'snacks', shape: 'triangle' }],
  [/vada|vadai|medu|bara\b|donut|doughnut/, { model: 'snacks', shape: 'ring' }],
  [/pork chop|lamb chop/, { model: 'steak' }],
  [/chop|cutlet|tikki|kabiraji|patty|croquette/, { model: 'snacks', shape: 'patty' }],
  [/nacho|chips|crisps|wafers|papad/, { model: 'snacks', shape: 'chip' }],
  [/jalebi|jilipi|imarti|jangiri/, { model: 'spiral', base: '#E8902A', accent: '#F6C04A' }],
  [/rasgulla|rosogolla|roshogolla|rasagola|chomchom|cham cham|rasmalai|ras malai|rosomalai/, { model: 'balls', base: '#F7F2E6', accent: '#F1E3C0' }],
  [/gulab jamun|jamun|pantua|langcha|kalo jam/, { model: 'balls', base: '#5A2614', accent: '#D99A3A' }],
  [/ladoo|laddu|laddoo|naru/, { model: 'balls', base: '#E8A23A', accent: '#F1D27A', shape: 'dry' }],
  [/kheer|payesh|payasam|phirni|firni|rabri|basundi|halwa/, { model: 'bowl', base: '#F1E3C0', accent: '#B9824A', topping: 'nuts' }],
  [/mishti doi|misti doi|bhapa doi/, { model: 'claypot', base: '#D9A65E', accent: '#9C5A26' }],
  [/lassi|chaas|buttermilk/, { model: 'glass', base: '#F6F0E2', accent: '#FFFFFF', shape: 'shake' }],
  [/kulfi/, { model: 'icecream', shape: 'stick' }],
  [/momo|dim sum|gyoza|dumpling|pitha|pithe|modak|bao/, { model: 'dumplings' }],
  [/biryani|biriyani|pulao|polao|pilaf/, { model: 'rice' }],
  [/khichdi|khichuri|khichri|pongal/, { model: 'bowl', base: '#E3B13A' }],
  [/chai|\bcha\b|masala tea/, { model: 'kulhad' }],
  [/cookie|biscuit/, { model: 'cookies' }],
  [/chocolate bar|candy|toffee/, { model: 'candy' }],
  [/waffle/, { model: 'pancakes', shape: 'waffle' }],
  [/beer|lager|ale\b/, { model: 'beer', base: '#E9A82E', accent: '#FBF7EE' }],
  [/wine/, { model: 'wine', base: '#7A1E2E', accent: '#F4E7C8' }],
  [/omelette|omelet|frittata/, { model: 'egg', shape: 'omelette' }],
  [/bhurji|scrambled/, { model: 'egg', shape: 'scrambled' }],
  [/boiled egg|boiled eggs|egg curry|dimer/, { shape: 'boiled' }],
  [/burrito|wrap|roll|kathi|kati|shawarma|frankie|quesadilla/, { model: 'wrap' }],
  [/thali|\bmeal\b|dal bhat|dal bhaat/, { model: 'thali' }],
];

/** What the dish has in it. */
const TOPPING_RULES: Rule[] = [
  [/prawn|chingri|shrimp|jhinga|lobster/, { topping: 'prawns' }],
  [/fish|\bmach|maach|machh|macher|ilish|ilis|hilsa|\brui\b|katla|bhetki|pabda|\bkoi\b|\bmeen|salmon|tuna/, { topping: 'fish' }],
  [/egg(?!plant)|\bdim\b|dimer|\banda\b|\bdeem\b/, { topping: 'egg' }],
  [/mutton|mangsho|mangsher|goat|lamb|keema|beef|rogan|nihari|pork|kosha/, { topping: 'darkChunks' }],
  [/chicken|murgir|murg|murgh|chooza/, { topping: 'chunks' }],
  [/paneer|chhena|chhanar|chanar|tofu/, { topping: 'cubes' }],
  [/chole|chana|chickpea|ghugni|chholar|cholar/, { topping: 'chickpeas' }],
  [/rajma|kidney|lobia|bean/, { topping: 'beans' }],
  [/gobi|phulkopi|phulkopir|cauliflower/, { topping: 'florets' }],
  [/matar|motor|koraishuti|peas/, { topping: 'peas' }],
  [/aloo|alu\b|potato|dum aloo/, { topping: 'potato' }],
];

/** The colour the name gives the gravy, batter or drink. */
const COLOUR_RULES: Rule[] = [
  [/dal makhani|maa ki dal|kali dal/, { base: '#6E2E1E' }],
  [/makhani|butter chicken|tikka masala|makhanwala/, { base: '#D8622B' }],
  [/palak|saag|spinach|shaak|methi|hariyali|pudina|mint|green|matcha|pistachio/, { base: '#4E7D2E' }],
  [/shorshe|sorshe|mustard|\bdal\b|daal|kadhi|khichdi|khichuri|haldi|turmeric|posto|moong/, { base: '#E2B23A' }],
  [/korma|malai|alfredo|white|navratan|shahi/, { base: '#EAD3A6' }],
  [/rajma|tomato|vindaloo|laal|lal\b|rasam|marinara|arrabbiata/, { base: '#B23A26' }],
  [/kosha|kalia|rogan|nihari|mangsho|mangsher|bhuna|stew|gravy/, { base: '#6B3A1E' }],
  [/sambar|sambhar/, { base: '#C2702A' }],
  [/chocolate|cocoa|brownie|mocha/, { base: '#5B3420' }],
  [/strawberry|rose|falooda|watermelon|pomegranate/, { base: '#D9607A' }],
  [/mango|aam\b|aamer/, { base: '#F2A93B' }],
  [/orange|santra|mosambi/, { base: '#F28C28' }],
  [/apple/, { base: '#D7402E' }],
  [/banana|kela/, { base: '#F2D24A' }],
  [/grape|angoor|berry|berries|blueberr/, { base: '#5A2E6E' }],
  [/coffee|espresso|americano/, { base: '#3A2216' }],
  [/cola|coke|pepsi/, { base: '#3B1F12' }],
  [/lemon|lime|nimbu|lebu/, { base: '#E9E26A' }],
  [/sugarcane/, { base: '#B9C46A' }],
  [/coconut|nariyal|daab/, { base: '#F4EFE2' }],
];

function firstMatch(rules: Rule[], name: string): Patch {
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? {};
}

/** Models that are a vessel or plate with something in it, so toppings and colours from the name apply. */
const FILLED = new Set<DishModelKind>(['bowl', 'rice', 'veg', 'thali', 'glass', 'cup', 'kulhad', 'fruit', 'wrap', 'squares', 'icecream', 'balls', 'cake', 'cookies']);

export function dishLook(category: CategoryId, name: string): DishLook {
  const lower = name.toLowerCase();
  const look: DishLook = { topping: 'none', ...LOOKS[category] };
  Object.assign(look, firstMatch(MODEL_RULES, lower));
  if (FILLED.has(look.model)) {
    const colour = firstMatch(COLOUR_RULES, lower);
    // A gravy's colour; drinks and sweets keep their own unless the name names a flavour. On a thali it is the dal's.
    if (colour.base && look.model === 'thali') look.accent = colour.base;
    else if (colour.base) look.base = colour.base;
    if (look.model === 'bowl' || look.model === 'rice' || look.model === 'veg' || look.model === 'wrap') {
      const topping = firstMatch(TOPPING_RULES, lower);
      if (topping.topping) look.topping = topping.topping;
    }
  }
  // Dishes looked at one by one (Bengali and Indian first) win over the general rules.
  return { ...look, ...DISH_LOOKS[name] };
}
