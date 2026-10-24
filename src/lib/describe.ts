/** Turns a language-neutral analysis into sentences in the user's language. */
import { FOCUS_START, deconstructPhase } from './deconstruct';
import type { Analysis, WatchOut } from './engine';
import { foodParts } from './parts';

type T = (key: string, params?: Record<string, string | number>) => string;
type List = (items: string[]) => string;

export function summaryText(analysis: Analysis, t: T, list: List, capitalize: (text: string) => string) {
  const good = list(analysis.summary.good.map((id) => t(`factors.${id}`)));
  const bad = list(analysis.summary.bad.map((id) => t(`factors.${id}`)));
  return capitalize(t(`summary.${analysis.summary.kind}`, { good, bad }));
}

export function watchText(item: WatchOut, t: T, list: List) {
  if (item.kind === 'allergens') {
    return t('watch.contains', { list: list(item.allergens.map((allergen) => t(`watch.allergen.${allergen}`))) });
  }
  if (item.kind === 'dietConflict') {
    return t('watch.dietConflict', {
      what: t(`watch.what.${item.what}`),
      diet: t(`profileOptions.diet.${item.diet}`).toLocaleLowerCase(),
    });
  }
  return t(`watch.${item.key}`);
}

export type SceneKind = 'intro' | 'inside' | 'gut' | 'body' | 'risks' | 'next' | 'outro';
/** One narrated scene. `lines` splits the narration where captions follow the picture. */
export type Scene = { kind: SceneKind; narration: string; lines?: string[] };

/** How long a scene runs: the voice's pace when speaking, reading speed for captions. */
export function sceneDuration(narration: string, speaking: boolean) {
  return Math.max(3500, narration.length * (speaking ? 72 : 55));
}

/**
 * The caption line for the take-apart scene at progress `t`: its opening line,
 * then each part's line while that part is in the spotlight, then the closing line.
 */
export function insideLine(lines: string[], t: number) {
  const parts = lines.length - 2;
  const { focus } = deconstructPhase(t, parts);
  if (focus >= 0) return lines[1 + focus];
  return t < FOCUS_START ? lines[0] : lines[lines.length - 1];
}

/** The explainer's script: one narrated scene per part of the analysis. */
export function buildScenes(analysis: Analysis, dish: string, t: T, list: List): Scene[] {
  const scenes: Scene[] = [{ kind: 'intro', narration: t('explainer.intro', { dish }) }];

  // Take the dish apart, part by part, then put it back together.
  const parts = foodParts(analysis);
  if (parts.length) {
    const lines = [
      t('explainer.inside', { dish }),
      ...parts.map((part) => `${t(`parts.${part.kind}.name`)}. ${t(`parts.${part.kind}.fact`)}`),
      t('explainer.together', { dish }),
    ];
    scenes.push({ kind: 'inside', narration: lines.join(' '), lines });
  }

  const gut = analysis.gut.slice(0, 3).map((item) => `${t(`gut.${item.id}.title`)}. ${t(`gut.${item.id}.detail`)}`);
  scenes.push({ kind: 'gut', narration: [t('explainer.gut'), ...gut].join(' ') });

  if (analysis.body.length) {
    const body = analysis.body.slice(0, 2).map((item) => `${t(`body.${item.id}.title`)}. ${t(`body.${item.id}.detail`)}`);
    scenes.push({ kind: 'body', narration: [t('explainer.body'), ...body].join(' ') });
  }

  const risks = analysis.risks.map((risk) => t(`risks.${risk}.name`).toLocaleLowerCase());
  scenes.push({
    kind: 'risks',
    narration: risks.length ? t('explainer.risks', { list: list(risks) }) : t('explainer.noRisks'),
  });

  const avoid = analysis.avoid.slice(0, 2).map((item) => t(`avoid.${item.id}.food`).toLocaleLowerCase());
  const eat = analysis.eat
    .filter((id) => id !== 'more_of_this')
    .slice(0, 2)
    .map((id) => t(`eat.${id}.food`).toLocaleLowerCase());
  scenes.push({ kind: 'next', narration: t('explainer.next', { avoid: list(avoid), eat: list(eat) }) });

  scenes.push({ kind: 'outro', narration: t('explainer.outro', { verdict: t(`verdict.${analysis.verdict}`).toLocaleLowerCase() }) });
  return scenes;
}
