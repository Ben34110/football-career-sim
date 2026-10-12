import type { SeasonStats } from '../types';
import { clamp } from './rng';

/**
 * The scandals have piled up (three strikes): how likely the club is to actually terminate the contract.
 * A player who is performing is protected: good recent ratings, a good season, the coach's trust and being clearly better
 * than the rest of the squad all pull it down (to almost nothing for the star of the team). A player in poor form gets no mercy.
 */
export function sackChance(input: { form: number[]; coachTrust: number; ovr: number; clubStrength: number; stats?: SeasonStats }): number {
  const recent = input.form.slice(-5);
  const formAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 6.5;
  const stats = input.stats;
  const seasonAvg = stats && stats.apps >= 3 ? stats.ratingSum / stats.apps : formAvg;
  const perf = 0.6 * formAvg + 0.4 * seasonAvg;
  const star = clamp((input.ovr - input.clubStrength) / 20, 0, 0.3);
  return clamp(0.85 - (perf - 6.5) * 0.7 - (input.coachTrust - 50) / 250 - star, 0.04, 0.95);
}
