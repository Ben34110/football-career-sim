import { getClub } from '../data/clubs';
import { DEFAULT_LOOK, type Look } from '../data/look';
import type {
  AttrKey,
  Attributes,
  ClubTier,
  EnergyState,
  Foot,
  Player,
  Position,
  RepKey,
  Reputation,
} from '../types';
import { clamp, randInt, weightedPick, type Rng } from './rng';

export const ATTR_KEYS: AttrKey[] = ['finishing', 'composure', 'vision', 'stamina'];
export const REP_KEYS: RepKey[] = ['coachTrust', 'fanPopularity', 'lockerRoom', 'mediaHeat'];

export const MAX_BOLTS = 5;
/** Lives bought with real money can stack above the regenerating five */
export const MAX_PAID_LIVES = 25;
export const REGEN_MS = 2 * 60 * 1000;
export const CALL_UP_OVR = 75;
export const U23_CALL_UP_OVR = 72;
export const U20_CALL_UP_OVR = 69;

export type NationalLevel = 'A' | 'U23' | 'U20';
/** How much weaker the national side is at each level (youth teams are not full strength). */
export const LEVEL_STRENGTH: Record<NationalLevel, number> = { A: 0, U23: -4, U20: -8 };

/** The national team you are good enough for: senior from 75, U23 from 72 (≤23 years), U20 from 69 (≤20 years). */
export function nationalLevel(ovr: number, age: number): NationalLevel | null {
  if (ovr >= CALL_UP_OVR) return 'A';
  if (ovr >= U23_CALL_UP_OVR && age <= 23) return 'U23';
  if (ovr >= U20_CALL_UP_OVR && age <= 20) return 'U20';
  return null;
}

/** The next call-up still to be earned, if any. */
export function nextNationalGoal(ovr: number, age: number): { level: NationalLevel; ovr: number } | null {
  if (ovr >= CALL_UP_OVR) return null;
  if (age <= 20 && ovr < U20_CALL_UP_OVR) return { level: 'U20', ovr: U20_CALL_UP_OVR };
  if (age <= 23 && ovr < U23_CALL_UP_OVR) return { level: 'U23', ovr: U23_CALL_UP_OVR };
  return { level: 'A', ovr: CALL_UP_OVR };
}
export const START_AGE = 18;
export const ALLOCATION_POINTS = 12;
export const MAX_ALLOC_PER_ATTR = 12;

export const POSITION_LABEL: Record<Position, string> = {
  ST: 'Striker',
  CAM: 'Attacking Mid',
  RW: 'Right Winger',
  LW: 'Left Winger',
};

export const ATTR_LABEL: Record<AttrKey, string> = {
  finishing: 'Finishing',
  composure: 'Composure',
  vision: 'Vision',
  stamina: 'Stamina',
};

export const REP_LABEL: Record<RepKey, string> = {
  coachTrust: 'Coach Trust',
  fanPopularity: 'Fan Popularity',
  lockerRoom: 'Locker Room Respect',
  mediaHeat: 'Media Heat',
};

const WING_WEIGHTS: Attributes = { finishing: 0.3, composure: 0.15, vision: 0.25, stamina: 0.3 };

export const POSITION_WEIGHTS: Record<Position, Attributes> = {
  ST: { finishing: 0.45, composure: 0.25, vision: 0.1, stamina: 0.2 },
  CAM: { finishing: 0.2, composure: 0.25, vision: 0.4, stamina: 0.15 },
  RW: WING_WEIGHTS,
  LW: WING_WEIGHTS,
};

export const BASE_ATTRS: Record<Position, Attributes> = {
  ST: { finishing: 62, composure: 56, vision: 48, stamina: 56 },
  CAM: { finishing: 52, composure: 58, vision: 63, stamina: 54 },
  RW: { finishing: 56, composure: 50, vision: 56, stamina: 62 },
  LW: { finishing: 56, composure: 50, vision: 56, stamina: 62 },
};

/** Unrounded overall: attributes plus the partial progress already earned toward the next point. */
export function rawOvr(attrs: Attributes, pos: Position, xp?: Attributes): number {
  const w = POSITION_WEIGHTS[pos];
  return ATTR_KEYS.reduce((s, k) => s + (attrs[k] + (xp?.[k] ?? 0)) * w[k], 0);
}

export function calcOvr(attrs: Attributes, pos: Position, xp?: Attributes): number {
  return clamp(Math.round(rawOvr(attrs, pos, xp)), 55, 99);
}

export const ovrOf = (p: Pick<Player, 'attrs' | 'position'> & { xp?: Attributes }) => calcOvr(p.attrs, p.position, p.xp);

/**
 * How far you are between your current OVR and the next one (0..1).
 * Counts the partial progress already earned toward the next attribute point.
 */
export function ovrProgress(attrs: Attributes, xp: Attributes | undefined, pos: Position): { ovr: number; next: number | null; pct: number } {
  // the displayed OVR already counts partial progress, so the bar and the number always agree
  const ovr = calcOvr(attrs, pos, xp);
  if (ovr >= 99) return { ovr, next: null, pct: 1 };
  const raw = rawOvr(attrs, pos, xp);
  // OVR rounds to the nearest integer, so the segment for `ovr` spans [ovr − 0.5, ovr + 0.5)
  return { ovr, next: ovr + 1, pct: clamp(raw - (ovr - 0.5), 0, 1) };
}

/** Market value in €M */
export function marketValue(ovr: number, age: number): number {
  const ageMul = age <= 20 ? 1.6 : age <= 23 ? 1.3 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.4;
  return 0.1 * Math.pow(1.2, ovr - 55) * ageMul;
}

/** Weekly wage in €K */
export function wageFor(ovr: number, age: number, tier: ClubTier): number {
  const tierMul = 1 + (5 - tier) * 0.18;
  return Math.max(2, Math.round(marketValue(ovr, age) * 1000 * 0.0055 * tierMul));
}

export function fmtMoneyM(m: number): string {
  if (m < 1) return `€${Math.round(m * 1000)}K`;
  if (m < 10) return `€${m.toFixed(1)}M`;
  return `€${Math.round(m)}M`;
}

export function fmtMoneyK(k: number): string {
  if (Math.abs(k) >= 1000) return `€${(k / 1000).toFixed(1)}M`;
  return `€${Math.round(k)}K`;
}

export const seasonLabel = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`;

/* ───────── Energy (5 bolts) ───────── */

export function syncEnergy(e: EnergyState, now: number): EnergyState {
  if (e.bolts >= MAX_BOLTS) return { bolts: e.bolts, at: now };
  const gained = Math.floor((now - e.at) / REGEN_MS);
  if (gained <= 0) return e;
  const bolts = Math.min(MAX_BOLTS, e.bolts + gained);
  return bolts >= MAX_BOLTS ? { bolts, at: now } : { bolts, at: e.at + gained * REGEN_MS };
}

export function spendBolts(e: EnergyState, n: number, now: number): EnergyState | null {
  const s = syncEnergy(e, now);
  if (s.bolts < n) return null;
  return { bolts: s.bolts - n, at: s.bolts >= MAX_BOLTS ? now : s.at };
}

export function gainBolts(e: EnergyState, n: number, now: number): EnergyState {
  const s = syncEnergy(e, now);
  // the clinic refills the regenerating lives only; bought lives are never reduced
  const bolts = Math.max(s.bolts, Math.min(MAX_BOLTS, s.bolts + n));
  return { bolts, at: bolts >= MAX_BOLTS ? now : s.at };
}

/** Lives added through a purchase. */
export function addPaidLives(e: EnergyState, n: number, now: number): EnergyState {
  const s = syncEnergy(e, now);
  return { bolts: Math.min(MAX_PAID_LIVES, s.bolts + n), at: s.bolts >= MAX_BOLTS ? now : s.at };
}

export function msToNextBolt(e: EnergyState, now: number): number {
  if (e.bolts >= MAX_BOLTS) return 0;
  return Math.max(0, e.at + REGEN_MS - now);
}

/* ───────── Reputation ───────── */

export function applyRep(rep: Reputation, delta: Partial<Reputation>): Reputation {
  const next = { ...rep };
  for (const k of REP_KEYS) {
    if (delta[k] !== undefined) next[k] = clamp(Math.round(rep[k] + (delta[k] as number)), 0, 100);
  }
  return next;
}

/* ───────── Creation ───────── */

export interface CreateInput {
  name: string;
  nationality: string;
  position: Position;
  foot: Foot;
  clubId: string;
  /** Extra points allocated by the user in the FTUE (sum ≤ ALLOCATION_POINTS) */
  allocation: Attributes;
  look?: Look;
}

export function createPlayer(input: CreateInput, now: number): Player {
  const base = BASE_ATTRS[input.position];
  const attrs = { ...base };
  for (const k of ATTR_KEYS) attrs[k] += clamp(input.allocation[k], 0, MAX_ALLOC_PER_ATTR);
  const club = getClub(input.clubId);
  const tier = club?.tier ?? 5;
  const ovr = calcOvr(attrs, input.position);
  return {
    name: input.name.trim() || 'Rookie',
    nationality: input.nationality,
    position: input.position,
    foot: input.foot,
    age: START_AGE,
    attrs,
    xp: { finishing: 0, composure: 0, vision: 0, stamina: 0 },
    rep: { coachTrust: 45, fanPopularity: 30, lockerRoom: 40, mediaHeat: 10 },
    morale: 65,
    energy: { bolts: MAX_BOLTS, at: now },
    clubId: input.clubId,
    contract: { wage: wageFor(ovr, START_AGE, tier), yearsLeft: 3 },
    money: 5,
    form: [],
    trophies: [],
    totals: { apps: 0, goals: 0, assists: 0, transfers: 0 },
    peakOvr: ovr,
    look: input.look ?? DEFAULT_LOOK,
    national: { caps: 0, goals: 0 },
  };
}

/* ───────── Progression ───────── */

export interface MatchPerformance {
  rating: number;
  goals: number;
  assists: number;
  clutchWins: number;
  /** Played the whole match */
  fullMatch: boolean;
}

/**
 * Attributes grow from what you do on the pitch: a strong rating, goals, assists,
 * decisions won and a full 90 minutes. A personal coach multiplies it.
 */
export function gainMatchXp(
  p: Player,
  perf: MatchPerformance,
  rng: Rng,
): { attrs: Attributes; xp: Attributes; gained: AttrKey[] } {
  const attrs = { ...p.attrs };
  const xp = { ...p.xp };
  const gained: AttrKey[] = [];
  const mult = 1 + 0.25 * (p.upgrades?.coach ?? 0);

  const w = POSITION_WEIGHTS[p.position];
  const general = Math.max(0, perf.rating - 6.2) * 0.1 * mult;
  if (general > 0) xp[weightedPick(ATTR_KEYS, (k) => w[k] + 0.05, rng)] += general;
  xp.finishing += perf.goals * 0.075 * mult;
  xp.vision += perf.assists * 0.06 * mult;
  xp.composure += perf.clutchWins * 0.035 * mult;
  if (perf.fullMatch) xp.stamina += 0.025 * mult;

  for (const k of ATTR_KEYS) {
    while (xp[k] >= 1 && attrs[k] < 99) {
      xp[k] -= 1;
      attrs[k] += 1;
      gained.push(k);
    }
  }
  return { attrs, xp, gained };
}

/** End-of-season development / decline. */
export function seasonDevelopment(
  p: Player,
  avgRating: number,
  rng: Rng,
): { attrs: Attributes; delta: Attributes } {
  const a = p.age;
  const baseGrowth = a <= 20 ? 1.5 : a <= 22 ? 1.1 : a <= 24 ? 0.7 : a <= 27 ? 0.2 : a <= 29 ? -0.3 : a <= 31 ? -1 : a <= 34 ? -1.7 : -2.5;
  const perfMod = avgRating >= 7.4 ? 0.6 : avgRating >= 6.8 ? 0.2 : avgRating > 0 && avgRating < 6.1 ? -0.5 : 0;
  const attrs = { ...p.attrs };
  const delta: Attributes = { finishing: 0, composure: 0, vision: 0, stamina: 0 };
  for (const k of ATTR_KEYS) {
    let g = baseGrowth + perfMod + (rng() - 0.5) * 1.4;
    if (k === 'stamina' && a >= 30) g -= 1;
    if (k === 'composure' && a >= 28) g += 0.6;
    const d = Math.round(g);
    const next = clamp(attrs[k] + d, 40, 99);
    delta[k] = next - attrs[k];
    attrs[k] = next;
  }
  return { attrs, delta };
}

export function randomName(): string {
  return ['Alex', 'Noah', 'Idris', 'Mateo', 'Kylian', 'Rayan'][randInt(0, 5)];
}

/** Attributes can be moved around (finishing → stamina…), within these limits. */
export const REBALANCE_MIN = 35;
export const REBALANCE_MAX = 99;

/** Price (€K) of moving one attribute point: it scales with what you earn. */
export const rebalanceCostPerPoint = (wage: number) => Math.max(3, Math.round(Math.max(wage, 3) * 0.5));

/** Points taken from some attributes (the ones that go down). */
export const pointsMoved = (from: Attributes, to: Attributes) => ATTR_KEYS.reduce((s, k) => s + Math.max(0, from[k] - to[k]), 0);
