import type { Reputation, TalkMemory } from '../types';

export const emptyTalks = (): TalkMemory => ({ stances: [], press: [], speeches: [], questions: [], instructions: [], mood: 0 });

/** Saying the same thing every week stops working: effects shrink after repeated choices. */
export function repetition(history: string[], pick: string, window = 4): { count: number; factor: number } {
  const count = history.slice(-window).filter((x) => x === pick).length;
  return { count, factor: count >= 3 ? 0.5 : count === 2 ? 0.75 : 1 };
}

/** Scale an effect set by a repetition factor (rounded, never to zero when it was non-zero). */
export function scaled(n: number, f: number) {
  if (f >= 1 || n === 0) return n;
  const v = Math.round(n * f);
  return v === 0 ? Math.sign(n) : v;
}

export function scaleStance<T extends { morale: number; perfBonus: number; rep: Partial<Reputation> }>(s: T, f: number): T {
  if (f >= 1) return s;
  return {
    ...s,
    morale: scaled(s.morale, f),
    perfBonus: scaled(s.perfBonus, f),
    rep: Object.fromEntries(Object.entries(s.rep).map(([k, v]) => [k, scaled(v as number, f)])),
  };
}

export const moodLabel = (mood: number) => (mood >= 25 ? 'Friendly' : mood <= -25 ? 'Hostile' : 'Neutral');
