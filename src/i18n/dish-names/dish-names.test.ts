/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CATALOG } from '../../data/catalog';
import { BENGALI_FOODS } from '../../data/catalog-bengali';
import labels from '../../data/food-labels.json';
import { bn } from './bn';
import { dishName, dishNameTranslations } from './index';

const known = new Set([...CATALOG.map((food) => food.name), ...labels.flatMap((entry) => (entry ? [entry[0] as string] : []))]);

test('every Bengali dish has its name in Bengali script', () => {
  const missing = BENGALI_FOODS.filter((food) => !bn[food.name]).map((food) => food.name);
  assert.deepEqual(missing, []);
});

test('Bengali names belong to dishes the app knows, so a renamed dish is caught', () => {
  assert.deepEqual(Object.keys(bn).filter((name) => !known.has(name)), []);
});

test('Bengali names are written in Bengali script', () => {
  for (const [dish, name] of Object.entries(bn)) {
    assert.match(name, /^[\p{Script=Bengali}\s‍-]+$/u, `${dish}: ${name}`);
  }
});

test('dishes show in the chosen language, and in English where there is no translation', () => {
  assert.equal(dishName('bn', 'Shorshe ilish'), 'সর্ষে ইলিশ');
  assert.equal(dishName('bn', 'Pizza'), 'পিৎজা');
  assert.equal(dishName('en', 'Shorshe ilish'), 'Shorshe ilish');
  assert.equal(dishName('hi', 'Shorshe ilish'), 'Shorshe ilish');
  assert.equal(dishName('bn', 'Sardenara'), 'Sardenara');
  assert.deepEqual(dishNameTranslations('Payesh'), ['পায়েস']);
  assert.deepEqual(dishNameTranslations('Sardenara'), []);
});
