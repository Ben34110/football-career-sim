import { callUpNeed, type NationalLevel } from './player';
import { clamp } from './rng';

export type SelectionStage = 'window' | 'tournament';
export type OmissionReason = 'form' | 'level' | 'unlucky';

export interface SelectionInput {
  level: NationalLevel;
  stage: SelectionStage;
  ovr: number;
  /** The strength of your nation: the coach picks the best, so being good is relative to it */
  natStrength: number;
  /** Ratings of the last few matches, newest last */
  form: number[];
  /** Season goals + assists, appearances */
  contributions: number;
  apps: number;
  /** Left out of the earlier window this season */
  omittedBefore: boolean;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 6.4);

/** Being good enough is not enough: the national coach also watches your recent form. */
export function selectionChance(i: SelectionInput): number {
  // no fixed bar: you are picked if you are good for your nation (below the level of its squad, hardly ever)
  const margin = i.ovr - callUpNeed(i.level, i.natStrength);
  const form = avg(i.form.slice(-5));
  const output = i.apps ? Math.min(0.15, (i.contributions / i.apps) * 0.15) : 0;
  const base = 0.5 + margin * 0.07 + (form - 6.4) * 0.2 + output * 0.8;
  return clamp(base - (i.omittedBefore ? 0.08 : 0), 0.02, 0.97);
}

export function omissionReason(i: SelectionInput): OmissionReason {
  if (avg(i.form.slice(-5)) < 6.2) return 'form';
  if (i.ovr - callUpNeed(i.level, i.natStrength) < 2) return 'level';
  return 'unlucky';
}
