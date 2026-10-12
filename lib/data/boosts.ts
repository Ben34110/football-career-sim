import type { Brief } from '../types';

export type BoostId = 'attack' | 'mental' | 'defence' | 'general';

export interface BoostDef {
  id: BoostId;
  /** Icon key (see GameIcon) */
  emoji: string;
  name: string;
  desc: string;
  /** Price in game money, as a number of weekly wages: deliberately steep */
  weeks: number;
  /** Price in real money, in euros (the App Store tier price is set in App Store Connect) */
  priceEur: number;
  effect: Brief;
  /** Small morale lift on top */
  morale?: number;
}

/**
 * Consumables for the start of a match, one per match. They answer the scouting report: attack for a leaky or slow side,
 * defence against a team that is deadly on the break, mental against a physical one, general when you want a bit of everything.
 * Deliberately modest: a nudge, not a cheat code.
 */
export const BOOSTS: BoostDef[] = [
  { id: 'attack', emoji: '⚽', name: 'Attack boost', desc: 'More chances for you: your attacks hit harder all match.', weeks: 9, priceEur: 0.99, effect: { myRateMul: 1.12 } },
  { id: 'mental', emoji: '🧠', name: 'Mental boost', desc: 'A cool head: your big moments are easier and you start on top.', weeks: 9, priceEur: 0.99, effect: { clutchBonus: 0.06, momentum: 10 }, morale: 6 },
  { id: 'defence', emoji: '🛡', name: 'Defence boost', desc: 'Fewer chances for them: the back line holds firm.', weeks: 9, priceEur: 0.99, effect: { oppRateMul: 0.88 } },
  { id: 'general', emoji: '⚡', name: 'All-round boost', desc: 'A bit of everything: form, attack, defence and big moments.', weeks: 15, priceEur: 1.99, effect: { perf: 1, myRateMul: 1.06, oppRateMul: 0.94, clutchBonus: 0.03 }, morale: 3 },
];

export const BOOST_BY_ID = Object.fromEntries(BOOSTS.map((b) => [b.id, b])) as Record<string, BoostDef>;

/** The boosts of the first version, folded into today's four so nobody loses what they bought. */
const LEGACY: Record<string, BoostId> = { meal: 'general', boots: 'general', hype: 'mental', focus: 'mental' };

export function migrateBoosts(bag: Record<string, number> | undefined): Record<string, number> | undefined {
  if (!bag) return bag;
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(bag)) {
    const to = LEGACY[id] ?? id;
    out[to] = Math.min(9, (out[to] ?? 0) + n);
  }
  return out;
}

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
