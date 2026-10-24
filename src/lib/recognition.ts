import type { Food } from './engine';

export type Prediction = { index: number; food: Food; confidence: number };

export type Recognition =
  | { kind: 'not_food' }
  /** Confident enough to show the result straight away. */
  | { kind: 'match'; prediction: Prediction; alternatives: Prediction[] }
  /** Let the user pick from the most likely dishes. */
  | { kind: 'choose'; predictions: Prediction[] };

const BACKGROUND_INDEX = 0;

/**
 * Turns the model's per-class probabilities into a decision. Pure, so it is
 * unit-tested without the native model.
 */
export function pickPredictions(scores: number[], foodFor: (index: number) => Food | null, max = 4): Recognition {
  const ranked: Prediction[] = [];
  for (let index = 0; index < scores.length; index++) {
    if (index === BACKGROUND_INDEX) continue;
    const food = foodFor(index);
    if (food) ranked.push({ index, food, confidence: scores[index] });
  }
  ranked.sort((a, b) => b.confidence - a.confidence);
  const top = ranked.slice(0, max);

  const background = scores[BACKGROUND_INDEX] ?? 0;
  if (!top.length || background >= 0.5 || top[0].confidence < 0.04) return { kind: 'not_food' };

  const [first, second] = top;
  if (first.confidence >= 0.6 && first.confidence >= 3 * (second?.confidence ?? 0)) {
    return { kind: 'match', prediction: first, alternatives: top.slice(1) };
  }
  return { kind: 'choose', predictions: top };
}
