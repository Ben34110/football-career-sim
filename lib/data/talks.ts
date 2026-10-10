import type { StanceEffect } from './speeches';
import type { TalkMemory } from '../types';

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

export function scaleStance(s: StanceEffect, f: number): StanceEffect {
  if (f >= 1) return s;
  return {
    ...s,
    morale: scaled(s.morale, f),
    perfBonus: scaled(s.perfBonus, f),
    rep: Object.fromEntries(Object.entries(s.rep).map(([k, v]) => [k, scaled(v as number, f)])),
  };
}

export const moodLabel = (mood: number) => (mood >= 25 ? 'Friendly' : mood <= -25 ? 'Hostile' : 'Neutral');

/** The manager answers what you said in the dressing room. Variables: {opp}. */
export function managerReaction(stance: StanceEffect, repeats: number, rng: () => number = Math.random): string {
  if (repeats >= 2) {
    return ['“The same thing again? Surprise me — words are cheap, lad.”', '“I’ve heard that one before. Show me on the pitch.”', '“Predictable. Try something different next time.”'][Math.floor(rng() * 3)];
  }
  const pool: Record<StanceEffect['id'], string[]> = {
    'back-boss': ['“Good. That’s the attitude I want against {opp}.”', '“I like that. We’ll need everyone pulling the same way.”'],
    'for-lads': ['“Right — that’s a leader talking. Keep that energy for {opp}.”', '“Good. The lads need to hear that from you.”'],
    'demand-ball': ['“Big words. Make sure the performance backs them up.”', '“You want the ball? Then deliver — {opp} won’t give you space.”'],
    'crack-joke': ['“Ha! Fine, keep them relaxed — but be serious when it matters.”', '“Not bad for a laugh. Now concentrate on {opp}.”'],
    'stay-quiet': ['“Quiet focus. I respect that.”', '“Say nothing, do everything. That’s the way.”'],
    'challenge-boss': ['“Challenge me? Brave. You’d better be right.”', '“We’ll talk about the tactics after. Today we follow the plan — mostly.”'],
    mentor: ['“Good to see you looking after the young ones. That matters.”', '“A real professional. The kid will remember it.”'],
  };
  const list = pool[stance.id];
  return list[Math.floor(rng() * list.length)];
}
