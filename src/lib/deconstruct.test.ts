/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CATALOG } from '../data/catalog';
import { DEFAULT_PROFILE } from './profile-options';
import { deconstructPhase, FOCUS_END, FOCUS_START } from './deconstruct';
import { insideLine } from './describe';
import { analyzeFood } from './engine';
import { foodFromCatalog, foodFromLabel } from './food-index';
import { foodParts } from './parts';

const analyze = (food: NonNullable<ReturnType<typeof foodFromLabel>>) => analyzeFood(food, { profile: DEFAULT_PROFILE, hour: 13 });

test('the sequence starts and ends with the dish whole', () => {
  for (const t of [0, 1]) {
    const phase = deconstructPhase(t, 4);
    assert.equal(phase.split, 0);
    assert.equal(phase.spread, 0);
    assert.equal(phase.focus, -1);
    assert.equal(phase.light, 0);
  }
});

test('the spotlight visits every part once, in order', () => {
  const seen: number[] = [];
  for (let t = 0; t <= 1; t += 0.001) {
    const { focus } = deconstructPhase(t, 5);
    if (focus >= 0 && seen.at(-1) !== focus) seen.push(focus);
  }
  assert.deepEqual(seen, [0, 1, 2, 3, 4]);
  assert.equal(deconstructPhase((FOCUS_START + FOCUS_END) / 2, 0).focus, -1);
});

test('the ring turns smoothly to each part', () => {
  let previous = 0;
  for (let t = 0; t <= 1; t += 0.001) {
    const { turn } = deconstructPhase(t, 5);
    assert.ok(turn >= previous - 1e-9, 'the ring never turns back');
    assert.ok(turn - previous < 0.1, `no jumps (at ${t.toFixed(3)})`);
    previous = turn;
  }
});

test('fried, refined dishes show their oil and flour; legumes show fibre and protein', () => {
  const parts = foodParts(analyze(foodFromCatalog('Chole bhature') ?? foodFromLabel(409)!));
  const kinds = parts.map((part) => part.kind);
  assert.ok(kinds.includes('fiber') && kinds.includes('protein'), kinds.join());
  assert.ok(kinds.includes('oil') && kinds.includes('starch'), kinds.join());
  assert.ok(parts.findIndex((part) => !part.good) > parts.findLastIndex((part) => part.good), 'good parts come first');
});

test('every food shows at most five parts, at most three of each kind of effect', () => {
  for (const item of CATALOG) {
    const parts = foodParts(analyze(foodFromCatalog(item.name)!));
    assert.ok(parts.length <= 5, item.name);
    assert.ok(parts.filter((part) => part.good).length <= 3, item.name);
    assert.ok(parts.filter((part) => !part.good).length <= 3, item.name);
    assert.equal(new Set(parts.map((part) => part.kind)).size, parts.length, `${item.name}: no repeats`);
  }
});

test('captions follow the spotlight', () => {
  const lines = ['intro', 'a', 'b', 'outro'];
  assert.equal(insideLine(lines, 0), 'intro');
  assert.equal(insideLine(lines, FOCUS_START + 0.01), 'a');
  assert.equal(insideLine(lines, FOCUS_END - 0.01), 'b');
  assert.equal(insideLine(lines, 1), 'outro');
});
