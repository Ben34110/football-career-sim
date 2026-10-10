import type { FixtureResult } from '../types';
import { clamp, type Rng } from '../engine/rng';

export interface Motm {
  name: string;
  /** Which side he plays for */
  team: 'me' | 'opp';
  rating: number;
  /** It is you */
  you: boolean;
}

const INITIALS = 'ABCDEFGHIJKLMNOPRSTV';

/**
 * Who is voted man of the match. You are in the running with your own rating (goals and assists count, a win helps, a red card hurts);
 * against you, the best performer of the winning side (or of either side after a draw).
 */
export function pickMotm(input: { res: FixtureResult; myNames: readonly string[]; oppNames: readonly string[]; playerName: string }, rng: Rng): Motm {
  const { res } = input;
  const diff = res.myScore - res.oppScore;
  const won = diff > 0 || (diff === 0 && !!res.shootout && res.shootout.my > res.shootout.opp);
  const lost = diff < 0 || (diff === 0 && !!res.shootout && res.shootout.my < res.shootout.opp);
  const rivalTeam: 'me' | 'opp' = won ? 'me' : lost ? 'opp' : rng() < 0.5 ? 'me' : 'opp';
  // the best player of a side: better after a bigger win
  const rivalRating = clamp(7.1 + Math.min(3, Math.abs(diff)) * 0.3 + rng() * 1.3, 6.9, 9.6);
  const mine = res.rating + res.goals * 0.25 + res.assists * 0.12 + (won ? 0.2 : 0) - (res.sentOff ? 0.8 : 0) - (res.benched ? 0.2 : 0);
  if (mine >= rivalRating) return { name: input.playerName, team: 'me', rating: Math.round(res.rating * 10) / 10, you: true };
  const pool = rivalTeam === 'me' ? input.myNames : input.oppNames;
  const surname = pool[Math.floor(rng() * pool.length)] ?? '';
  const initial = INITIALS[Math.floor(rng() * INITIALS.length)];
  return { name: `${initial}. ${surname}`, team: rivalTeam, rating: Math.round(rivalRating * 10) / 10, you: false };
}
