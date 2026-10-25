#!/usr/bin/env -S npx tsx
/**
 * Builds assets/models/dish-embeddings.bin, the dish side of the web app's
 * photo recognizer (src/lib/dish-recognition.ts). Run it after changing the
 * catalog, its aliases or the photo model's labels:
 *
 *   npm run build:dishes
 *
 * 1. Every dish sentence from src/lib/dish-labels.ts is embedded once with
 *    the SigLIP 2 text model, so phones only run the image half.
 * 2. Each dish gets a prior from how often its English Wikipedia article was
 *    read in 60 days: among dishes that look alike, people photograph pizza
 *    far more often than sardenaira. Counts are cached in
 *    scripts/data/dish-popularity.json and fetched only for new dishes.
 */
import { AutoTokenizer, SiglipTextModel } from '@huggingface/transformers';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { dishLabels, NOT_FOOD_PROMPTS } from '../src/lib/dish-labels';
import { DISH_MODEL, encodeDishTable } from '../src/lib/dish-recognition';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const popularityFile = join(root, 'scripts/data/dish-popularity.json');
const output = join(root, 'assets/models/dish-embeddings.bin');

/** Weight of log10(readers) added to the cosine similarity. Tuned on held-out photos. */
const PRIOR_WEIGHT = 0.016;
/** Dishes without a food article count as this percentile of readership... */
const UNKNOWN_PERCENTILE = 0.25;
/** ...and catalog dishes (Bengali and Indian home food, chosen for our users) as at least this one. */
const CATALOG_PERCENTILE = 0.5;
/** Short descriptions that say an article is about food, not a fish called Koi or a plant called Coca. */
const FOODISH = /dish|food|cuisine|bread|cake|soup|stew|drink|beverage|sweet|dessert|snack|pastry|sauce|salad|confection|curry|noodle|pudding|cookie|biscuit|cheese|sausage|dumpling|pancake|pie|tea|coffee|cocktail|wine|beer|liquor|spirit|fruit|vegetable|rice|meat|fish|egg|condiment|spread|porridge|candy|chocolate|ice cream|sandwich|pizza|pasta|delicacy|meal|breakfast|street|bun|roll|flatbread|fritter|juice|milk|yogurt|cereal|nut|bean|seafood|steak|kebab|taco|sushi/i;

const labels = dishLabels();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Page = { title: string; missing?: boolean; description?: string; pageprops?: { disambiguation?: string }; pageviews?: Record<string, number | null> };

/** 60-day readership of each title's article (after redirects), or null if there is no food article. */
async function fetchReadership(names: string[]) {
  const found: Record<string, number | null> = {};
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', redirects: '1', titles: batch.join('|'),
      prop: 'pageviews|description|pageprops', ppprop: 'disambiguation', pvipdays: '60',
    });
    let query: { pages: Page[]; normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[] } | undefined;
    // Page views arrive for a few pages per response; follow `continue` until all have them.
    let next: Record<string, string> | undefined = {};
    while (next) {
      const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}&${new URLSearchParams(next)}`, {
        headers: { 'User-Agent': 'foodhabits-build/1.0 (https://github.com/debnathSD/foodhabits.com)' },
      });
      if (!response.ok) {
        await pause(5000);
        continue;
      }
      const data = await response.json();
      if (!query) query = data.query;
      else for (const page of data.query.pages as Page[]) {
        const known = query.pages.find((candidate) => candidate.title === page.title);
        if (known && page.pageviews) known.pageviews = page.pageviews;
      }
      next = data.continue;
      await pause(300);
    }
    const follow = (from: string, list?: { from: string; to: string }[]) => list?.find((step) => step.from === from)?.to ?? from;
    for (const name of batch) {
      const title = follow(follow(name, query!.normalized), query!.redirects);
      const page = query!.pages.find((candidate) => candidate.title === title);
      const food = page && !page.missing && page.pageprops?.disambiguation === undefined && FOODISH.test(page.description ?? '');
      found[name] = food ? Object.values(page.pageviews ?? {}).reduce<number>((sum, views) => sum + (views ?? 0), 0) : null;
    }
    console.log(`Wikipedia: ${Math.min(i + 50, names.length)}/${names.length}`);
    await pause(1000);
  }
  return found;
}

const cached: Record<string, number | null> = existsSync(popularityFile) ? JSON.parse(readFileSync(popularityFile, 'utf8')) : {};
const names = labels.map((label) => label.name);
Object.assign(cached, await fetchReadership(names.filter((name) => !(name in cached))));
const popularity = Object.fromEntries(names.map((name) => [name, cached[name]]));
writeFileSync(popularityFile, `${JSON.stringify(popularity, null, 1)}\n`);

const known = Object.values(popularity).filter((views): views is number => views !== null).map((views) => Math.log10(views + 1)).sort((a, b) => a - b);
const percentile = (q: number) => known[Math.floor(q * (known.length - 1))];
const prior = labels.map((label) => {
  const views = popularity[label.name];
  const readership = views === null ? percentile(UNKNOWN_PERCENTILE) : Math.log10(views + 1);
  return PRIOR_WEIGHT * (label.ref.kind === 'catalog' ? Math.max(readership, percentile(CATALOG_PERCENTILE)) : readership);
});

const tokenizer = await AutoTokenizer.from_pretrained(DISH_MODEL.repo, { revision: DISH_MODEL.revision });
const model = await SiglipTextModel.from_pretrained(DISH_MODEL.repo, { revision: DISH_MODEL.revision, dtype: DISH_MODEL.textDtype });
async function embed(sentences: string[]) {
  const result: Float32Array[] = [];
  for (let i = 0; i < sentences.length; i += 64) {
    const batch = sentences.slice(i, i + 64);
    // SigLIP was trained on text padded to 64 tokens; shorter padding changes the embeddings.
    const { pooler_output } = await model(tokenizer(batch, { padding: 'max_length', truncation: true, max_length: 64 }));
    const dim = pooler_output.dims[1];
    for (let b = 0; b < batch.length; b++) {
      const row = (pooler_output.data as Float32Array).slice(b * dim, (b + 1) * dim);
      const length = Math.hypot(...row);
      result.push(row.map((x) => x / length));
    }
  }
  return result;
}

const dishes = await embed(labels.flatMap((label) => label.prompts));
const notFood = await embed(NOT_FOOD_PROMPTS);
const bytes = encodeDishTable(labels, dishes, notFood, prior);
writeFileSync(output, bytes);
console.log(`Wrote ${labels.length} dishes (${dishes.length} sentences) to assets/models/dish-embeddings.bin, ${(bytes.length / 1e6).toFixed(1)} MB`);
