/**
 * The engine's gut score (1-10) bucketed into the verdict the app shows, so
 * the label and the score can never disagree.
 */

export type Verdict = 'great' | 'good' | 'okay' | 'limit' | 'avoid';

export function verdictForScore(score: number): Verdict {
  if (score >= 9) return 'great';
  if (score >= 7) return 'good';
  if (score >= 5) return 'okay';
  if (score >= 3) return 'limit';
  return 'avoid';
}
