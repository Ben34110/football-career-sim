import type { Curl, KickKind, KickResult } from '../types';
import { clamp, weightedPick, type Rng } from './rng';

/**
 * The goal is split into 8 zones, 4 columns × 2 rows:
 *
 *   0 ┃ 1 ┃ 2 ┃ 3     ← top row   (corners = 0 & 3)
 *   4 ┃ 5 ┃ 6 ┃ 7     ← bottom row (corners = 4 & 7)
 */
export const ZONE_COUNT = 8;
export const zoneRow = (z: number) => (z < 4 ? 0 : 1);
export const zoneCol = (z: number) => z % 4;

export const ZONE_NAMES = [
  'Top Left Corner',
  'Top Left-Centre',
  'Top Right-Centre',
  'Top Right Corner',
  'Bottom Left Corner',
  'Bottom Left-Centre',
  'Bottom Right-Centre',
  'Bottom Right Corner',
];

/** Chance of dragging the shot off target — corners are riskier. */
const MISS_RISK = [0.17, 0.09, 0.09, 0.17, 0.08, 0.035, 0.035, 0.08];

/** Where keepers tend to dive before the random bias. */
const DIVE_WEIGHTS = [0.1, 0.08, 0.08, 0.1, 0.17, 0.15, 0.15, 0.17];

const KIND_MISS_MUL: Record<KickKind, number> = { penalty: 1, freekick: 1.5, shootout: 1.1 };

export interface KickInput {
  zone: number;
  kind: KickKind;
  finishing: number;
  composure: number;
  /** Opposition strength — better teams have better keepers */
  keeperLevel: number;
  /** 0 (relaxed) … 1 (World Cup final) */
  pressure: number;
  /** Free kicks only: bend the ball around the wall */
  curl?: Curl;
}

export interface KickOutcome {
  result: KickResult;
  shotZone: number;
  diveZone: number;
  /** For UI flavour */
  missP: number;
  saveP: number;
  curl: Curl;
}

export function pickDiveZone(rng: Rng): number {
  const idx = Array.from({ length: ZONE_COUNT }, (_, i) => i);
  // Every keeper has a bias on the day — keeps the game from having a "solved" corner.
  const bias = idx.map(() => 0.65 + rng() * 0.7);
  return weightedPick(idx, (i) => DIVE_WEIGHTS[i] * bias[i], rng);
}

export function saveChance(shot: number, dive: number, keeperLevel: number, kind: KickKind): number {
  const kq = clamp(0.8 + (keeperLevel - 60) / 100, 0.75, 1.2);
  const sameRow = zoneRow(shot) === zoneRow(dive);
  const colDiff = Math.abs(zoneCol(shot) - zoneCol(dive));
  let p = 0;
  if (shot === dive) p = 0.78;
  else if (sameRow && colDiff === 1) p = 0.28;
  else if (!sameRow && colDiff === 0) p = 0.22;
  const topCorner = shot === 0 || shot === 3;
  if (topCorner) p *= 0.75;
  if (kind === 'freekick') p *= 0.8;
  return clamp(p * kq, 0, 0.92);
}

export function resolveKick(input: KickInput, rng: Rng): KickOutcome {
  const { zone, kind } = input;
  const curl: Curl = kind === 'freekick' ? input.curl ?? 'straight' : 'straight';
  // Bending the ball toward the side you aim at fools the keeper and beats the wall;
  // bending it away from your target is a gamble.
  const side = zoneCol(zone) < 2 ? 'left' : 'right';
  const bend = curl === 'straight' ? 'none' : curl === side ? 'with' : 'against';
  const missMul = bend === 'none' ? 1 : bend === 'with' ? 1.15 : 1.45;
  const saveMul = bend === 'none' ? 1 : bend === 'with' ? 0.72 : 0.92;
  const wallMul = bend === 'none' ? 1 : bend === 'with' ? 0.2 : 0.55;

  const skill = (0.6 * input.finishing + 0.4 * input.composure) / 100;
  const missP = clamp(
    MISS_RISK[zone] * (1.9 - 1.5 * skill) * KIND_MISS_MUL[kind] * missMul * (1 + input.pressure * 0.6),
    0.015,
    0.55,
  );
  const diveZone = pickDiveZone(rng);
  const saveP = clamp(saveChance(zone, diveZone, input.keeperLevel, kind) * saveMul, 0, 0.92);

  // Free kicks: low shots can hit the wall
  const wallP = kind === 'freekick' ? (zoneRow(zone) === 1 ? 0.22 : 0.04) * wallMul : 0;

  let result: KickResult;
  if (rng() < wallP) result = 'blocked';
  else if (rng() < missP) result = 'missed';
  else if (rng() < saveP) result = 'saved';
  else result = 'goal';

  return { result, shotZone: zone, diveZone, missP, saveP, curl };
}

/** Quick auto-resolve for teammates in a shootout */
export function teammateKick(conversion: number, rng: Rng): boolean {
  return rng() < conversion;
}
