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

test('Bangladeshi and more West Bengal dishes are found', () => {
  const cases: [string, string][] = [
    ['kacchi', 'Kacchi biryani'],
    ['কাচ্চি বিরিয়ানি', 'Kacchi biryani'],
    ['tehari', 'Tehari'],
    ['aloo bhorta', 'Aloo bhorta'],
    ['শুঁটকি ভর্তা', 'Shutki bhorta'],
    ['begun bhorta', 'Begun pora'],
    ['chotpoti', 'Chotpoti'],
    ['kala bhuna', 'Kala bhuna'],
    ['beef curry', 'Gorur mangsho bhuna'],
    ['chicken roast', 'Murgir roast'],
    ['borhani', 'Borhani'],
    ['shemai', 'Shemai'],
    ['bhapa pitha', 'Bhapa pitha'],
    ['rajbhog', 'Rajbhog'],
    ['lau chingri', 'Lau chingri'],
    ['pomfret', 'Rupchanda bhaja'],
    ['bhuna khichuri', 'Bhuna khichuri'],
    ['chanachur', 'Bombay mix'],
    ['faluda', 'Falooda'],
  ];
  for (const [query, expected] of cases) {
    assert.equal(searchFoods(query, 3)[0]?.name, expected, `"${query}" should find ${expected} first`);
  }
});

test('everyday Bengali words find everyday food', () => {
  const cases: [string, string][] = [
    ['rice', 'White rice'],
    ['bhat', 'White rice'],
    ['ভাত', 'White rice'],
    ['ruti', 'Roti'],
    ['porota', 'Plain paratha'],
    ['torkari', 'Mixed veg sabzi'],
    ['pauruti', 'White bread toast'],
    ['tok doi', 'Plain curd'],
    ['pudding', 'Crème caramel'],
    ['halua', 'Sujir halua'],
  ];
  for (const [query, expected] of cases) {
    assert.equal(searchFoods(query, 3)[0]?.name, expected, `"${query}" should find ${expected} first`);
  }
});

test('any dish is found by its Bengali name', () => {
  assert.equal(searchFoods('পিৎজা', 3)[0]?.name, 'Pizza');
  assert.equal(searchFoods('মোমো', 3)[0]?.name, 'Momos');
  assert.equal(searchFoods('রসগোল্লা', 3)[0]?.name, 'Rasgulla');
});
