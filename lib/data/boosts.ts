import type { Brief } from '../types';

export interface BoostDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  /** Price as a number of weekly wages */
  weeks: number;
  effect: Brief;
  /** Small morale lift on top */
  morale?: number;
}

/**
 * Consumables for the start of a match. One per match, and deliberately modest:
 * a nudge, not a cheat code.
 */
export const BOOSTS: BoostDef[] = [
  { id: 'meal', emoji: '🍝', name: 'Pre-match meal', desc: '+1 form and you shrug off 1 life of fatigue.', weeks: 1.5, effect: { perf: 1, fatigue: -1 } },
  { id: 'hype', emoji: '🔊', name: 'Hype video', desc: 'Start on top of them, with a small morale lift.', weeks: 2, effect: { momentum: 14 }, morale: 4 },
  { id: 'focus', emoji: '🎯', name: 'Focus session', desc: 'Your big moments are a little easier.', weeks: 2.5, effect: { clutchBonus: 0.05 } },
  { id: 'boots', emoji: '👟', name: 'Lucky boots', desc: '+2 form for one match.', weeks: 3.5, effect: { perf: 2 } },
];

export const BOOST_BY_ID = Object.fromEntries(BOOSTS.map((b) => [b.id, b]));

export const boostPrice = (def: BoostDef, wage: number) => Math.max(3, Math.round(Math.max(wage, 3) * def.weeks));

/** Combine two briefs (ritual + boost): bonuses add, rate multipliers multiply. */
export function mergeBrief(a?: Brief, b?: Brief): Brief | undefined {
  if (!a && !b) return undefined;
  const x = a ?? {};
  const y = b ?? {};
  return {
    perf: (x.perf ?? 0) + (y.perf ?? 0),
    momentum: (x.momentum ?? 0) + (y.momentum ?? 0),
    fatigue: (x.fatigue ?? 0) + (y.fatigue ?? 0),
    myRateMul: (x.myRateMul ?? 1) * (y.myRateMul ?? 1),
    oppRateMul: (x.oppRateMul ?? 1) * (y.oppRateMul ?? 1),
    clutchBonus: (x.clutchBonus ?? 0) + (y.clutchBonus ?? 0),
    target: (x.target ?? 0) + (y.target ?? 0),
  };
}
