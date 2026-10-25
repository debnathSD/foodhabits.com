/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { dishLabels } from './dish-labels';
import { decodeDishTable, type DishTable, recognizeDish } from './dish-recognition';

const file = readFileSync(new URL('../../assets/models/dish-embeddings.bin', import.meta.url));
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const labels = dishLabels();

/** The stored embedding of a sentence, as if a photo matched it perfectly. */
function vector(table: DishTable, row: number) {
  return Float32Array.from(table.vectors.subarray(row * table.dim, (row + 1) * table.dim), (x) => x * table.scales[row]);
}

function dishRow(table: DishTable, name: string) {
  return table.starts[labels.findIndex((label) => label.name === name)];
}

test('the shipped embeddings match the current dish list (run npm run build:dishes if not)', () => {
  assert.doesNotThrow(() => decodeDishTable(buffer, labels));
});

test('a photo that looks exactly like a dish is recognised straight away', () => {
  const table = decodeDishTable(buffer, labels);
  for (const name of ['Pizza', 'Masala dosa', 'Rasgulla', 'Shorshe ilish']) {
    const recognition = recognizeDish(table, vector(table, dishRow(table, name)));
    assert.equal(recognition.kind, 'match', name);
    assert.equal(recognition.kind === 'match' && recognition.prediction.food.name, name);
  }
});

test('a photo halfway between two dishes asks the user to choose', () => {
  const table = decodeDishTable(buffer, labels);
  const [a, b] = [vector(table, dishRow(table, 'Idli')), vector(table, dishRow(table, 'Medu vada'))];
  const recognition = recognizeDish(table, a.map((x, i) => x + b[i]));
  assert.equal(recognition.kind, 'choose');
  const names = recognition.kind === 'choose' ? recognition.predictions.map((prediction) => prediction.food.name) : [];
  assert.ok(names.includes('Idli') && names.includes('Medu vada'), names.join(', '));
});

test('a photo of something else is not food', () => {
  const table = decodeDishTable(buffer, labels);
  assert.equal(recognizeDish(table, vector(table, table.notFoodStart)).kind, 'not_food');
});
