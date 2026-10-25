/**
 * Everything the explainer video shows for one meal, already in the user's
 * language. Serializable, so it can cross into the video's web view.
 */
import type { Part } from '../lib/deconstruct';
import { buildScenes, sceneDuration, type SceneKind } from '../lib/describe';
import type { Analysis } from '../lib/engine';
import { foodParts, partsColor } from '../lib/parts';
import type { Verdict } from '../lib/verdict';

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;

export type VideoScene = { kind: SceneKind; narration: string; lines: string[]; frames: number };

/** The least time each scene needs for its animation, in seconds, however short its narration. */
const MIN_SECONDS: Record<SceneKind, number> = { intro: 5.5, inside: 14, gut: 7, body: 5, risks: 5, next: 6.5, outro: 5 };

export type ExplainerVideoProps = {
  dish: string;
  title: string;
  brand: string;
  verdict: Verdict;
  verdictLabel: string;
  score: number;
  /** Verdict colour on the dark video background. */
  color: string;
  dishColor: string;
  parts: Part[];
  partNames: string[];
  partTags: { good: string; bad: string };
  gutHealth: number;
  labels: { gut: string; body: string; risks: string; avoid: string; eat: string; friendly: string; troublemakers: string };
  body: { text: string; effect: 'good' | 'bad' | 'mixed' }[];
  risks: string[];
  avoid: string[];
  eat: string[];
  scenes: VideoScene[];
  rtl: boolean;
};

type T = (key: string, params?: Record<string, string | number>) => string;

/** Share of the meal's gut effects that are good, 0-1, for the microbe mix. */
export function gutHealth(analysis: Analysis) {
  const good = analysis.gut.filter((item) => item.effect === 'good').length;
  const bad = analysis.gut.filter((item) => item.effect === 'bad').length;
  return good + bad === 0 ? 0.6 : 0.15 + (good / (good + bad)) * 0.75;
}

export function buildExplainerProps({
  analysis,
  dish,
  t,
  list,
  color,
  speaking,
  rtl,
}: {
  analysis: Analysis;
  dish: string;
  t: T;
  list: (items: string[]) => string;
  color: string;
  /** Scenes last as long as the voice takes when narrated, reading speed otherwise. */
  speaking: boolean;
  rtl: boolean;
}): ExplainerVideoProps {
  const parts = foodParts(analysis);
  const scenes = buildScenes(analysis, dish, t, list).map((scene) => ({
    kind: scene.kind,
    narration: scene.narration,
    lines: scene.lines ?? [scene.narration],
    frames: Math.round(Math.max(sceneDuration(scene.narration, speaking) / 1000, MIN_SECONDS[scene.kind]) * VIDEO_FPS),
  }));
  return {
    dish,
    title: t('explainer.title', { dish }),
    brand: t('explainer.brand'),
    verdict: analysis.verdict,
    verdictLabel: t(`verdict.${analysis.verdict}`),
    score: analysis.score,
    color,
    dishColor: partsColor(parts),
    parts,
    partNames: parts.map((part) => t(`parts.${part.kind}.name`)),
    partTags: { good: t('parts.good'), bad: t('parts.bad') },
    gutHealth: gutHealth(analysis),
    labels: {
      gut: t('result.gutTitle'),
      body: t('result.bodyTitle'),
      risks: t('result.risksTitle'),
      avoid: t('result.avoidTitle'),
      eat: t('result.eatTitle'),
      friendly: t('explainer.friendly'),
      troublemakers: t('explainer.troublemakers'),
    },
    body: analysis.body.slice(0, 4).map((item) => ({ text: t(`body.${item.id}.title`), effect: item.effect })),
    risks: analysis.risks.map((risk) => t(`risks.${risk}.name`)),
    avoid: analysis.avoid.slice(0, 3).map((item) => t(`avoid.${item.id}.food`)),
    eat: analysis.eat
      .filter((id) => id !== 'more_of_this')
      .slice(0, 3)
      .map((id) => t(`eat.${id}.food`)),
    scenes,
    rtl,
  };
}

/** Frame each scene starts at, and the total length. */
export function sceneTimeline(scenes: VideoScene[]) {
  const starts: number[] = [];
  let total = 0;
  for (const scene of scenes) {
    starts.push(total);
    total += scene.frames;
  }
  return { starts, total: Math.max(1, total) };
}
