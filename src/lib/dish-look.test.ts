/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CATEGORIES, type CategoryId } from '../data/categories';
import { type DishLook, dishLook } from './dish-look';
import { searchFoods } from './food-index';

const pick = ({ model, topping, garnish }: DishLook) => ({ model, topping, garnish });

function look(name: string) {
  const food = searchFoods(name).find((candidate) => candidate.name === name);
  assert.ok(food, `${name} is a known dish`);
  return dishLook(food.category, food.name);
}

test('every food type has a 3D look', () => {
  for (const category of Object.keys(CATEGORIES) as CategoryId[]) {
    const result = dishLook(category, '');
    assert.ok(result.model, category);
    assert.match(result.base, /^#[0-9A-F]{6}$/i, category);
  }
});

test('Bengali dishes look like themselves', () => {
  assert.deepEqual(pick(look('Shorshe ilish')), { model: 'bowl', topping: 'fish', garnish: ['chilies'] });
  assert.equal(look('Macher jhol').extra, 'potato');
  assert.equal(look('Kolkata biryani').topping, 'biryani');
  assert.equal(look('Bhetki paturi').model, 'paturi');
  assert.equal(look('Jhalmuri').model, 'cone');
  assert.equal(look('Luchi').model, 'puffed');
  assert.equal(look('Mishti doi').model, 'claypot');
  assert.equal(look('Rasgulla').model, 'balls');
  assert.equal(look('Langcha').shape, 'long');
  assert.equal(look('Begun bhaja').shape, 'slice');
  assert.equal(look('Kosha mangsho').topping, 'darkChunks');
});

test('Indian dishes look like themselves', () => {
  assert.equal(look('Masala dosa').model, 'crepe');
  assert.equal(look('Masala dosa').sides?.length, 2);
  assert.equal(look('Pav bhaji').model, 'pav');
  assert.equal(look('Chole').topping, 'chickpeas');
  assert.equal(look('Palak paneer').topping, 'cubes');
  assert.equal(look('Chicken biryani').model, 'rice');
  assert.equal(look('Rajma chawal').model, 'riceCurry');
  assert.equal(look('Filter coffee').model, 'tumbler');
});

test('the name picks the model where the food type is too broad', () => {
  assert.equal(look('Pizza').model, 'pizza');
  assert.equal(look('Steak').model, 'steak');
  assert.equal(look('Pork chop').model, 'steak');
  assert.equal(look('Fish and chips').model, 'fillet');
  assert.equal(look('Lasagne').model, 'casserole');
});

test('names do not trip over look-alike words', () => {
  // "eggplant" is not egg; "fruit" is not the fish "rui".
  assert.notEqual(dishLook('curry_veg', 'Eggplant curry').topping, 'egg');
  assert.notEqual(dishLook('fruit_dessert', 'Fruit custard').topping, 'fish');
  assert.notEqual(dishLook('legumes', 'Dal makhani').base, '#E2B23A');
});
