import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickVoice } from './voice';

const voices = [
  { identifier: 'rishi', language: 'en-IN' },
  { identifier: 'piya', language: 'bn-IN' },
  { identifier: 'maged', language: 'ar-001' },
  { identifier: 'lekha', language: 'hi_IN' },
];

test('narration picks a voice for the language, preferring the exact region', () => {
  assert.equal(pickVoice(voices, 'bn-IN'), 'piya');
  assert.equal(pickVoice(voices, 'hi-IN'), 'lekha');
  assert.equal(pickVoice(voices, 'ar-SA'), 'maged');
  assert.equal(pickVoice([{ identifier: 'us', language: 'en-US' }, ...voices], 'en-IN'), 'rishi');
});

test('no voice for the language means none, not the default voice', () => {
  assert.equal(pickVoice(voices, 'or-IN'), null);
});
