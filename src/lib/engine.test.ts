/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { CATEGORIES, type CategoryId } from '../data/categories';
import { CATALOG } from '../data/catalog';
import labels from '../data/food-labels.json';
import { analyzeFood, type Food } from './engine';
import { foodFromCatalog, foodFromLabel, genericFood, searchFoods } from './food-index';
import { DEFAULT_PROFILE, type Profile } from './profile-options';

const lunch = { profile: DEFAULT_PROFILE, hour: 13 };

function byName(name: string): Food {
  const food = searchFoods(name).find((candidate) => candidate.name === name);
  assert.ok(food, `${name} should be searchable`);
  return food;
}

function analyze(name: string, profile: Profile = DEFAULT_PROFILE, hour = 13) {
  return analyzeFood(byName(name), { profile, hour });
}

describe('scores', () => {
  test('gut-friendly foods score high', () => {
    for (const name of ['Garden salad', 'Dal tadka', 'Idli', 'Masala dosa', 'Kimchi', 'Oatmeal', 'Banana']) {
      assert.ok(analyze(name).score >= 8, `${name} scored ${analyze(name).score}`);
    }
  });

  test('fried, sugary and processed foods score low', () => {
    for (const name of ['Samosa', 'Hot dog', 'Doughnut', 'Gulab jamun', 'Cola', 'Salami', 'Chicken nugget']) {
      assert.ok(analyze(name).score <= 3, `${name} scored ${analyze(name).score}`);
    }
  });

  test('water is perfect and the verdict follows the score', () => {
    const water = analyze('Water');
    assert.equal(water.score, 10);
    assert.equal(water.verdict, 'great');
    assert.equal(analyze('Hot dog').verdict, 'avoid');
  });

  test('every known food analyses to a score between 1 and 10', () => {
    const foods: Food[] = [
      ...labels.map((_, index) => foodFromLabel(index)).filter((food) => food !== null),
      ...CATALOG.map((item) => foodFromCatalog(item.name)!),
      ...(Object.keys(CATEGORIES) as CategoryId[]).map(genericFood),
    ];
    assert.ok(foods.length > 2000);
    for (const food of foods) {
      const { score, avoid, eat, gut } = analyzeFood(food, lunch);
      assert.ok(score >= 1 && score <= 10, food.name);
      assert.ok(avoid.length >= 3, `${food.name} needs at least 3 foods to avoid`);
      assert.ok(eat.length >= 1 && gut.length >= 1, food.name);
    }
  });
});

describe('health risks', () => {
  test('processed meat warns about bowel cancer', () => {
    assert.ok(analyze('Pepperoni pizza').risks.includes('colorectal_cancer'));
    assert.ok(analyze('Salami').risks.includes('colorectal_cancer'));
  });

  test('sugary drinks warn about diabetes and fatty liver', () => {
    const cola = analyze('Cola');
    assert.ok(cola.risks.includes('type2_diabetes'));
    assert.ok(cola.risks.includes('fatty_liver'));
    assert.equal(cola.avoid[0].id, 'sugary');
  });

  test('healthy foods carry no disease warnings', () => {
    assert.deepEqual(analyze('Garden salad').risks, []);
    assert.deepEqual(analyze('Dal tadka').risks, []);
  });
});

describe('personalisation', () => {
  test('flags meat for vegetarians', () => {
    const result = analyze('Chicken curry', { ...DEFAULT_PROFILE, diet: 'vegetarian' });
    assert.ok(result.watch.some((item) => item.kind === 'dietConflict' && item.what === 'meat'));
  });

  test('flags dairy for vegans', () => {
    const result = analyze('Kheer', { ...DEFAULT_PROFILE, diet: 'vegan' });
    assert.ok(result.watch.some((item) => item.kind === 'dietConflict' && item.what === 'dairy'));
  });

  test('lactose intolerance lowers the score of milk sweets and warns', () => {
    const plain = analyze('Kheer');
    const sensitive = analyze('Kheer', { ...DEFAULT_PROFILE, sensitivities: ['lactose'] });
    assert.ok(sensitive.score < plain.score);
    assert.ok(sensitive.watch.some((item) => item.kind === 'note' && item.key === 'lactose'));
    assert.ok(sensitive.avoid.some((item) => item.id === 'dairy'));
  });

  test('vegetarians are offered plant protein instead of meat', () => {
    const result = analyze('Pepperoni pizza', { ...DEFAULT_PROFILE, diet: 'vegetarian' });
    const processed = result.avoid.find((item) => item.id === 'processed_meat');
    assert.equal(processed?.instead, 'plant_protein');
  });

  test('suggests fermented foods instead of yoghurt for vegans', () => {
    const result = analyze('Samosa', { ...DEFAULT_PROFILE, diet: 'vegan' });
    assert.ok(result.eat.includes('fermented'));
    assert.ok(!result.eat.includes('yogurt'));
  });
});
