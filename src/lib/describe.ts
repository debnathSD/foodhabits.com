/** Turns a language-neutral analysis into sentences in the user's language. */
import type { Analysis, WatchOut } from './engine';

type T = (key: string, params?: Record<string, string | number>) => string;
type List = (items: string[]) => string;
/** Prepares a message for use mid-sentence (`inSentence` from i18n). */
type Lower = (text: string) => string;

export function summaryText(analysis: Analysis, t: T, list: List, capitalize: (text: string) => string) {
  const good = list(analysis.summary.good.map((id) => t(`factors.${id}`)));
  const bad = list(analysis.summary.bad.map((id) => t(`factors.${id}`)));
  return capitalize(t(`summary.${analysis.summary.kind}`, { good, bad }));
}

export function watchText(item: WatchOut, t: T, list: List, lower: Lower) {
  if (item.kind === 'allergens') {
    return t('watch.contains', { list: list(item.allergens.map((allergen) => t(`watch.allergen.${allergen}`))) });
  }
  if (item.kind === 'dietConflict') {
    return t('watch.dietConflict', {
      what: t(`watch.what.${item.what}`),
      diet: lower(t(`profileOptions.diet.${item.diet}`)),
    });
  }
  return t(`watch.${item.key}`);
}
