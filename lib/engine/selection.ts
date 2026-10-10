import { CALL_UP_OVR, U20_CALL_UP_OVR, U23_CALL_UP_OVR, type NationalLevel } from './player';
import { clamp } from './rng';

export type SelectionStage = 'window' | 'tournament';
export type OmissionReason = 'form' | 'level' | 'unlucky';

export interface SelectionInput {
  level: NationalLevel;
  stage: SelectionStage;
  ovr: number;
  /** Ratings of the last few matches, newest last */
  form: number[];
  /** Season goals + assists, appearances */
  contributions: number;
  apps: number;
  /** Left out of the earlier window this season */
  omittedBefore: boolean;
}

const MIN: Record<NationalLevel, number> = { A: CALL_UP_OVR, U23: U23_CALL_UP_OVR, U20: U20_CALL_UP_OVR };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 6.4);

/** Being good enough is not enough: the national coach also watches your recent form. */
export function selectionChance(i: SelectionInput): number {
  const margin = Math.max(0, i.ovr - MIN[i.level]);
  const form = avg(i.form.slice(-5));
  const output = i.apps ? Math.min(0.15, (i.contributions / i.apps) * 0.15) : 0;
  const base = 0.58 + margin * 0.06 + (form - 6.4) * 0.28 + output;
  return clamp(base - (i.omittedBefore ? 0.08 : 0), 0.05, 0.97);
}

export function omissionReason(i: SelectionInput): OmissionReason {
  if (avg(i.form.slice(-5)) < 6.2) return 'form';
  if (i.ovr - MIN[i.level] < 2) return 'level';
  return 'unlucky';
}
