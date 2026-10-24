/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { searchFoods } from './food-index';

const names = (query: string) => searchFoods(query).map((food) => food.name);

test('finds Indian staples the photo model lacks', () => {
  assert.equal(names('dosa')[0], 'Masala dosa');
  assert.equal(names('chai')[0], 'Masala chai');
  assert.ok(names('roti').includes('Roti'));
  assert.ok(names('chapati').includes('Roti'));
});

test('matches aliases and model dishes', () => {
  const biryani = names('biryani');
  assert.ok(biryani.includes('Hyderabadi biryani'));
  assert.ok(biryani.includes('Chicken biryani'));
  assert.ok(names('golgappa').includes('Pani puri'));
});

test('ignores accents and case', () => {
  assert.ok(names('CREME BRULEE').includes('Crème brûlée'));
});

test('multi-word queries match word starts', () => {
  assert.ok(names('fried chick').includes('Fried chicken'));
});

test('returns nothing for empty queries', () => {
  assert.deepEqual(names('   '), []);
});

test('Bengali dishes are found by their usual spellings and in Bengali script', () => {
  const cases: [string, string][] = [
    ['payesh', 'Payesh'],
    ['পায়েস', 'Payesh'],
    ['chatni', 'Chatni'],
    ['চাটনি', 'Chatni'],
    ['mishti doi', 'Mishti doi'],
    ['মিষ্টি দই', 'Mishti doi'],
    ['shorshe ilish', 'Shorshe ilish'],
    ['macher jhol', 'Macher jhol'],
    ['aloo posto', 'Aloo posto'],
    ['kosha mangsho', 'Kosha mangsho'],
    ['puchka', 'Phuchka'],
    ['rosogolla', 'Rasgulla'],
  ];
  for (const [query, expected] of cases) {
    assert.equal(searchFoods(query, 3)[0]?.name, expected, `"${query}" should find ${expected} first`);
  }
});
