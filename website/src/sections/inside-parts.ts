import type { Part } from '@lib/deconstruct';

/** Chole bhature, taken apart: the parts the app's engine finds in it, in the site's words. */
export const PARTS: (Part & { name: string; fact: string })[] = [
  {
    kind: 'fiber',
    good: true,
    amount: 0.6,
    name: 'Fibre',
    fact: 'From the chickpeas. It feeds your friendly gut microbes and keeps you full for longer.',
  },
  {
    kind: 'protein',
    good: true,
    amount: 0.6,
    name: 'Protein',
    fact: 'Chickpeas bring plant protein that builds and repairs muscle.',
  },
  {
    kind: 'oil',
    good: false,
    amount: 1,
    name: 'Frying oil',
    fact: 'The bhatura is deep-fried: extra calories, and reused oil can irritate the gut.',
  },
  {
    kind: 'starch',
    good: false,
    amount: 0.9,
    name: 'Refined flour',
    fact: 'Maida has lost its fibre, so it turns to sugar fast and does little for your microbes.',
  },
];
