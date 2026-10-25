/**
 * Minimal i18n: nested message objects per language, dotted keys, `{name}`
 * placeholders, and English as the fallback for anything not yet translated.
 */
import { bn } from './locales/bn';
import { en, type Messages } from './locales/en';
import { hi } from './locales/hi';
import type { LanguageCode } from './languages';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type Translation = DeepPartial<Messages>;

export const DICTIONARIES: Partial<Record<LanguageCode, Translation>> = { en, hi, bn };

/** Languages whose translation is complete enough to offer. */
export const TRANSLATED: LanguageCode[] = Object.keys(DICTIONARIES) as LanguageCode[];

export type Params = Record<string, string | number>;

function lookup(source: unknown, key: string): unknown {
  let node = source;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function interpolate(text: string, params?: Params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function translate(language: LanguageCode, key: string, params?: Params): string {
  const value = lookup(DICTIONARIES[language], key) ?? lookup(en, key);
  return typeof value === 'string' ? interpolate(value, params) : key;
}

/** For array or object messages, e.g. the swaps for a category. */
export function translateValue<T>(language: LanguageCode, key: string): T | undefined {
  return (lookup(DICTIONARIES[language], key) ?? lookup(en, key)) as T | undefined;
}

/** "a, b and c" using the language's own word for "and". */
export function joinList(language: LanguageCode, items: string[]) {
  if (items.length <= 1) return items.join('');
  const and = translate(language, 'common.and');
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

export function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
