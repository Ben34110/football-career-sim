import { getClub } from '../data/clubs';
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
export const REGEN_MS = 4 * 60 * 1000;
export const CALL_UP_OVR = 75;
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

export function calcOvr(attrs: Attributes, pos: Position): number {
  const w = POSITION_WEIGHTS[pos];
  const raw = ATTR_KEYS.reduce((s, k) => s + attrs[k] * w[k], 0);
  return clamp(Math.round(raw), 55, 99);
}

export const ovrOf = (p: Pick<Player, 'attrs' | 'position'>) => calcOvr(p.attrs, p.position);

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
  if (e.bolts >= MAX_BOLTS) return { bolts: MAX_BOLTS, at: now };
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
  const bolts = Math.min(MAX_BOLTS, s.bolts + n);
  return { bolts, at: bolts >= MAX_BOLTS ? now : s.at };
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
  };
}

/* ───────── Progression ───────── */

/** Distribute match XP across attributes relevant to the position. */
export function gainMatchXp(
  p: Player,
  rating: number,
  rng: Rng,
): { attrs: Attributes; xp: Attributes; gained: AttrKey[] } {
  const attrs = { ...p.attrs };
  const xp = { ...p.xp };
  const gained: AttrKey[] = [];
  const amount = Math.max(0, rating - 5.8) * 0.08;
  if (amount > 0) {
    const w = POSITION_WEIGHTS[p.position];
    const key = weightedPick(ATTR_KEYS, (k) => w[k] + 0.05, rng);
    xp[key] += amount;
  }
  for (const k of ATTR_KEYS) {
    while (xp[k] >= 1 && attrs[k] < 99) {
      xp[k] -= 1;
      attrs[k] += 1;
      gained.push(k);
    }
  }
  return { attrs, xp, gained };
}

export function trainAttr(p: Player, key: AttrKey, rng: Rng): { attrs: Attributes; xp: Attributes; levelUp: boolean } {
  const attrs = { ...p.attrs };
  const xp = { ...p.xp };
  xp[key] += 0.5 + rng() * 0.3;
  let levelUp = false;
  while (xp[key] >= 1 && attrs[key] < 99) {
    xp[key] -= 1;
    attrs[key] += 1;
    levelUp = true;
  }
  return { attrs, xp, levelUp };
}

/** End-of-season development / decline. */
export function seasonDevelopment(
  p: Player,
  avgRating: number,
  rng: Rng,
): { attrs: Attributes; delta: Attributes } {
  const a = p.age;
  const baseGrowth = a <= 20 ? 2.2 : a <= 22 ? 1.7 : a <= 24 ? 1.1 : a <= 27 ? 0.4 : a <= 29 ? -0.2 : a <= 31 ? -1 : a <= 34 ? -1.7 : -2.5;
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
