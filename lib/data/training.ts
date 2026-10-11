import type { AttrKey, Brief, MiniKind, MiniQuality } from '../types';
import type { RitualOption } from './rituals';

/**
 * Match-day training. The scouts report on the opponent — one weak point to exploit and one danger to defuse — and you pick
 * the drill that suits it. The drill is a real mini-game: how well you play it decides how much of its effect you carry
 * into the match, and a drill that answers the scouting report works half as well again. It also trains an attribute.
 */
export type TraitId = 'leaky' | 'slow' | 'tired' | 'counters' | 'physical';
export type DrillId = 'finishing' | 'defence' | 'counter' | 'fitness' | 'rest';
/** Where on the board the trait is shown */
export type Zone = 'def' | 'mid' | 'att';

export interface Trait {
  id: TraitId;
  kind: 'weak' | 'danger';
  label: string;
  /** What the scout says */
  line: string;
  /** The drill that answers it */
  drill: DrillId;
  zone: Zone;
}

export const TRAITS: Record<TraitId, Trait> = {
  leaky: { id: 'leaky', kind: 'weak', label: 'Leaky at the back', line: 'Their defence gives up chances all game long.', drill: 'finishing', zone: 'def' },
  slow: { id: 'slow', kind: 'weak', label: 'Slow to recover', line: 'They are caught out when you break at speed.', drill: 'counter', zone: 'mid' },
  tired: { id: 'tired', kind: 'weak', label: 'Fades late', line: 'Their legs go in the last half hour.', drill: 'fitness', zone: 'mid' },
  counters: { id: 'counters', kind: 'danger', label: 'Deadly on the break', line: 'Lose the ball cheaply and they punish it.', drill: 'defence', zone: 'att' },
  physical: { id: 'physical', kind: 'danger', label: 'Physical and aggressive', line: 'They will try to run you ragged.', drill: 'fitness', zone: 'mid' },
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The same scouting report every time you come back to the same fixture. */
export function scoutReport(seed: string, diff: number): { weak: Trait; danger: Trait } {
  const h = hash(seed);
  const weaks: TraitId[] = ['leaky', 'slow', 'tired'];
  // a stronger side is more likely to be dangerous on the break, a weaker one physical and rough
  const dangers: TraitId[] = diff <= -3 ? ['counters', 'counters', 'physical'] : diff >= 3 ? ['physical', 'physical', 'counters'] : ['counters', 'physical'];
  return { weak: TRAITS[weaks[h % weaks.length]], danger: TRAITS[dangers[(h >>> 8) % dangers.length]] };
}

export interface Drill {
  id: DrillId;
  /** Icon key (see GameIcon) */
  emoji: string;
  name: string;
  blurb: string;
  /** The mini-games it can be played as (one is drawn for each session) */
  games: MiniKind[];
  attr?: AttrKey;
}

export const DRILLS: Drill[] = [
  { id: 'finishing', emoji: '⚽', name: 'Finishing', blurb: 'Hit the target: more chances for you.', games: ['volley', 'rebound'], attr: 'finishing' },
  { id: 'defence', emoji: '🛡', name: 'Defensive shape', blurb: 'Block the shots: fewer chances for them.', games: ['block'], attr: 'vision' },
  { id: 'counter', emoji: '⚡', name: 'Counter-attacks', blurb: 'Run at pace: a flying start and quicker breaks.', games: ['slalom'], attr: 'composure' },
  { id: 'fitness', emoji: '👟', name: 'Fitness', blurb: 'A sprint duel: fresh legs for the whole match.', games: ['race'], attr: 'stamina' },
  { id: 'rest', emoji: '🌬', name: 'Rest', blurb: 'Skip the session: recover and stay calm.', games: [] },
];
export const DRILL_BY_ID = Object.fromEntries(DRILLS.map((d) => [d.id, d])) as Record<DrillId, Drill>;

/** How much of the drill's effect an answer to the scouting report adds. */
export const SCOUTED = 1.5;

/** The mini-game of this session: the same one for the same fixture, so you cannot reroll it. */
export const gameFor = (d: Drill, seed: string): MiniKind => d.games[hash(`${seed}|${d.id}`) % d.games.length];

const XP: Record<MiniQuality, number> = { perfect: 0.06, good: 0.035, miss: 0.01 };

export interface Effect {
  kind: 'attack' | 'defence' | 'start' | 'fatigue';
  n: number;
}

/** What a session of `drill`, played at quality `q`, brings into the match. */
export function trainOutcome(drill: Drill, q: MiniQuality, scouted: boolean, seed: string): { option: RitualOption; effects: Effect[] } {
  const k = scouted ? SCOUTED : 1;
  const lvl = q === 'perfect' ? 1 : q === 'good' ? 0.6 : 0.12;
  const brief: Brief = {};
  const effects: Effect[] = [];
  let morale = q === 'perfect' ? 6 : q === 'good' ? 4 : 1;
  let perf = 0;
  const pct = (mul: number) => Math.round(Math.abs(mul - 1) * 100);
  switch (drill.id) {
    case 'finishing':
      brief.myRateMul = 1 + 0.18 * lvl * k;
      perf = q === 'miss' ? 0 : 1;
      effects.push({ kind: 'attack', n: pct(brief.myRateMul) });
      break;
    case 'defence':
      brief.oppRateMul = 1 - 0.18 * lvl * k;
      effects.push({ kind: 'defence', n: pct(brief.oppRateMul) });
      break;
    case 'counter':
      brief.momentum = Math.round(30 * lvl * k);
      brief.myRateMul = 1 + 0.12 * lvl * k;
      effects.push({ kind: 'start', n: brief.momentum });
      break;
    case 'fitness':
      brief.fatigue = -Math.round(2 * lvl * k * 10) / 10;
      perf = q === 'perfect' ? 2 : q === 'good' ? 1 : 0;
      effects.push({ kind: 'fatigue', n: Math.abs(brief.fatigue) });
      break;
    case 'rest':
      brief.fatigue = -1;
      morale = 8;
      effects.push({ kind: 'fatigue', n: 1 });
      break;
  }
  const rep = q === 'perfect' ? { coachTrust: 2 } : q === 'good' ? { coachTrust: 1 } : {};
  const line: Record<MiniQuality, string> = {
    perfect: 'The coach nods: that was exactly what we needed.',
    good: 'A solid session. The group is ready.',
    miss: 'A scrappy session. Not much to take from it.',
  };
  return {
    effects,
    option: {
      id: `train-${seed}`,
      emoji: drill.emoji,
      label: drill.name,
      line: drill.id === 'rest' ? 'You take it easy and clear your head.' : line[q],
      morale: Math.round(morale * (scouted ? 1.2 : 1)),
      perfBonus: perf,
      rep,
      expectation: drill.id === 'rest' ? 'Modest' : 'Standard',
      brief,
      train: drill.attr ? { attr: drill.attr, xp: XP[q] * k } : undefined,
    },
  };
}
