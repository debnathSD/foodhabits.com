/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { foodFromLabel } from './food-index';
import { pickPredictions } from './recognition';

const LABEL_COUNT = 2024;
const SUSHI = 1234;
const RAMEN = 1445;
const PHO = 604;

function scores(entries: Record<number, number>) {
  const result = new Array(LABEL_COUNT).fill(0);
  for (const [index, value] of Object.entries(entries)) result[Number(index)] = value;
  return result;
}

test('a confident prediction is accepted straight away', () => {
  const recognition = pickPredictions(scores({ [SUSHI]: 0.8, [RAMEN]: 0.1 }), foodFromLabel);
  assert.equal(recognition.kind, 'match');
  assert.equal(recognition.kind === 'match' && recognition.prediction.food.name, 'Sushi');
});

test('close calls ask the user to choose', () => {
  const recognition = pickPredictions(scores({ [RAMEN]: 0.45, [PHO]: 0.35 }), foodFromLabel);
  assert.equal(recognition.kind, 'choose');
  assert.deepEqual(
    recognition.kind === 'choose' && recognition.predictions.slice(0, 2).map((prediction) => prediction.food.name),
    ['Ramen', 'Pho'],
  );
});

test('the background class or tiny confidence means no food', () => {
  assert.equal(pickPredictions(scores({ 0: 0.9, [SUSHI]: 0.05 }), foodFromLabel).kind, 'not_food');
  assert.equal(pickPredictions(scores({ [SUSHI]: 0.02 }), foodFromLabel).kind, 'not_food');
});

test('unnamed classes are never offered', () => {
  // Index 12 is an unnamed Knowledge Graph id in the label map.
  const recognition = pickPredictions(scores({ 12: 0.9, [SUSHI]: 0.3 }), foodFromLabel);
  assert.notEqual(recognition.kind, 'not_food');
  const names = recognition.kind === 'choose' ? recognition.predictions.map((p) => p.food.name) : [];
  assert.ok(!names.some((name) => name.startsWith('/')));
});
