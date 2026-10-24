/**
 * The take-apart sequence: a dish splits open, the parts it is made of spread
 * out at micro scale, each comes forward under a spotlight (mint when it helps,
 * coral when it harms), and then everything comes back together.
 *
 * Pure timing and types with no imports, shared by the app's explainer, its
 * captions and the website, so the 3D scene and the words always agree.
 */

export type PartKind =
  | 'fiber'
  | 'protein'
  | 'probiotics'
  | 'goodFats'
  | 'vitamins'
  | 'water'
  | 'oil'
  | 'starch'
  | 'sugar'
  | 'salt'
  | 'satFat'
  | 'additives'
  | 'alcohol';

/** One part of a dish; `amount` (0-1) sets how much of it is shown. */
export type Part = { kind: PartKind; good: boolean; amount: number };

/** Share of the sequence when the spotlight tour starts and ends. */
export const FOCUS_START = 0.3;
export const FOCUS_END = 0.82;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/**
 * Where the sequence is at progress `t` (0-1) for `count` parts:
 * - `split`: how far the dish has opened (0 closed, 1 open)
 * - `spread`: how far the parts have spread out of it
 * - `focus`: index of the part in the spotlight, or -1
 * - `turn`: the ring's position, in parts, so the focused one faces the viewer
 * - `light`: spotlight strength (0-1)
 */
export function deconstructPhase(t: number, count: number) {
  const split = smooth(0.06, 0.18, t) * (1 - smooth(0.9, 0.99, t));
  const spread = smooth(0.14, 0.3, t) * (1 - smooth(0.82, 0.93, t));
  const slots = clamp01((t - FOCUS_START) / (FOCUS_END - FOCUS_START)) * count;
  const focus = count > 0 && t >= FOCUS_START && t < FOCUS_END ? Math.min(count - 1, Math.floor(slots)) : -1;
  const within = focus < 0 ? 0 : slots - focus;
  // The ring holds while a part is lit, then turns to the next one.
  const turn =
    focus < 0 ? (t < FOCUS_START ? 0 : Math.max(0, count - 1)) : focus + (focus < count - 1 ? smooth(0.78, 1, within) : 0);
  const light = focus < 0 ? 0 : smooth(0, 0.14, within) * (1 - smooth(0.82, 0.96, within));
  return { split, spread, focus, turn, light };
}
