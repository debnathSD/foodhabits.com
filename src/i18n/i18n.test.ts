/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CATEGORIES, type CategoryId } from '../data/categories';
import { CATALOG } from '../data/catalog';
import labels from '../data/food-labels.json';
import { summaryText, watchText } from '../lib/describe';
import { analyzeFood, type Food } from '../lib/engine';
import { foodFromCatalog, foodFromLabel, genericFood } from '../lib/food-index';
import { DEFAULT_PROFILE, DIETS, GOALS, SENSITIVITIES } from '../lib/profile-options';
import { capitalize, DICTIONARIES, inSentence, joinList, TRANSLATED, translate, translateValue } from './index';
import { en } from './locales/en';

/** Collects every key `t()` is asked for, failing on any that has no English text. */
function strictT(language: (typeof TRANSLATED)[number] = 'en') {
  return (key: string, params?: Record<string, string | number>) => {
    const text = translate(language, key, params);
    assert.notEqual(text, key, `Missing message: ${key}`);
    assert.ok(!/\{\w+\}/.test(text), `Unfilled placeholder in ${key}: ${text}`);
    return text;
  };
}

const allFoods: Food[] = [
  ...labels.map((_, index) => foodFromLabel(index)).filter((food) => food !== null),
  ...CATALOG.map((item) => foodFromCatalog(item.name)!),
  ...(Object.keys(CATEGORIES) as CategoryId[]).map(genericFood),
];

const profiles = [
  DEFAULT_PROFILE,
  { diet: 'vegan' as const, sensitivities: SENSITIVITIES.map((s) => s.id), goals: [] },
  { diet: 'jain' as const, sensitivities: ['lactose' as const], goals: [] },
  { diet: 'vegetarian' as const, sensitivities: [], goals: [] },
];

test('every message the engine produces exists, for every food and profile', () => {
  for (const language of TRANSLATED) {
    const t = strictT(language);
    const list = (items: string[]) => joinList(language, items);
    const lower = (text: string) => inSentence(language, text);
    for (const food of allFoods) {
      for (const profile of profiles) {
        for (const hour of [8, 18]) {
          const analysis = analyzeFood(food, { profile, hour });
          summaryText(analysis, t, list, capitalize);
          analysis.watch.forEach((item) => watchText(item, t, list, lower));
          t(`verdict.${analysis.verdict}`);
          analysis.gut.forEach((item) => [t(`gut.${item.id}.title`), t(`gut.${item.id}.detail`)]);
          analysis.body.forEach((item) => [t(`body.${item.id}.title`), t(`body.${item.id}.detail`)]);
          analysis.risks.forEach((risk) => [t(`risks.${risk}.name`), t(`risks.${risk}.detail`)]);
          analysis.avoid.forEach((item) => {
            t(`avoid.${item.id}.food`);
            t(`avoid.${item.id}.gut`);
            t(`avoid.${item.id}.body`);
            t(`instead.${item.instead}`);
            t(`timeframe.${item.timeframe}`);
          });
          analysis.eat.forEach((id) => [t(`eat.${id}.food`), t(`eat.${id}.why`)]);
        }
      }
    }
  }
});

test('every category has a name and at least one swap', () => {
  for (const category of Object.keys(CATEGORIES)) {
    assert.ok(en.categories[category as keyof typeof en.categories], `No name for ${category}`);
    const swaps = translateValue<unknown[]>('en', `swaps.${category}`);
    assert.ok(Array.isArray(swaps) && swaps.length > 0, `No swaps for ${category}`);
  }
});

test('every profile option has a label', () => {
  const t = strictT();
  DIETS.forEach((option) => t(`profileOptions.diet.${option.id}`));
  SENSITIVITIES.forEach((option) => t(`profileOptions.sensitivities.${option.id}`));
  GOALS.forEach((option) => t(`profileOptions.goals.${option.id}`));
});

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');

test('translations only use keys that exist in English', () => {
  const walk = (node: unknown, reference: unknown, path: string) => {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node)) {
      const next = (reference as Record<string, unknown>)[key];
      assert.ok(next !== undefined, `Unknown key ${path}${key}`);
      walk(value, next, `${path}${key}.`);
    }
  };
  for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
    if (language !== 'en') walk(dictionary, en, `${language}: `);
  }
});

test('every translation covers every English message, with the same placeholders', () => {
  for (const [language, dictionary] of Object.entries(DICTIONARIES)) {
    if (language === 'en') continue;
    const walk = (reference: unknown, node: unknown, path: string) => {
      if (typeof reference === 'string') {
        assert.equal(typeof node, 'string', `${language}: missing ${path}`);
        assert.equal(placeholders(node as string), placeholders(reference), `${language}: placeholders differ in ${path}`);
        return;
      }
      if (Array.isArray(reference)) {
        assert.ok(Array.isArray(node) && node.length > 0, `${language}: missing ${path}`);
        return;
      }
      for (const [key, value] of Object.entries(reference as Record<string, unknown>)) {
        // The app name is the brand and stays as it is.
        if (path === '' && key === 'common') {
          const { appName: _brand, ...rest } = value as Record<string, unknown>;
          walk(rest, (node as Record<string, unknown>)?.common, 'common.');
          continue;
        }
        walk(value, (node as Record<string, unknown> | undefined)?.[key], `${path}${key}.`);
      }
    };
    walk(en, dictionary, '');
  }
});

test('falls back to English and fills placeholders', () => {
  assert.equal(translate('ta', 'common.continue'), 'தொடரவும்');
  // Translations leave the brand name out, so it comes from English.
  assert.equal(translate('ta', 'common.appName'), 'foodhabits.com');
  assert.equal(translate('en', 'home.afterMeal', { dish: 'Idli' }), 'After your Idli');
  assert.equal(joinList('en', ['a', 'b', 'c']), 'a, b and c');
  assert.equal(joinList('ur', ['a', 'b', 'c']), 'a، b اور c');
  assert.equal(joinList('ar', ['أ', 'ب', 'ج']), 'أ، ب وج');
  assert.equal(joinList('zh', ['甲', '乙', '丙']), '甲、乙和丙');
  assert.equal(joinList('ja', ['りんご', '梨', '桃']), 'りんご、梨と桃');
});

test('mid-sentence messages lose their capital, except acronyms and German nouns', () => {
  assert.equal(inSentence('en', 'Bowel cancer'), 'bowel cancer');
  assert.equal(inSentence('fr', 'AVC'), 'AVC');
  assert.equal(inSentence('de', 'Darmkrebs'), 'Darmkrebs');
});
