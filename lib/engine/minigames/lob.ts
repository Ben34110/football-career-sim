/**
 * The lob — the rules of the scene, with no drawing in it so they can be tested.
 *
 * You are through on goal and the keeper comes off his line. Hold to charge the chip, release to play it:
 * the longer you hold, the further it travels. It has to pass over his gloves and still drop under the bar.
 * He rushes out, then comes at you for good: wait for him to leave his line, but not until he is on top of you.
 *
 * Everything is in metres from the striker (the goal line is G metres away) and in seconds.
 */
export const G = 24;
export const BAR = 2.44;
const GRAV = 9.81;
export const ANGLE = (34 * Math.PI) / 180;
export const R_MIN = 8;
export const R_MAX = 40;
/** Seconds of holding from an empty to a full charge */
export const CHARGE = 1.5;
/** The ball leaves the boot this many metres in front of the striker's feet, at this height */
const LAUNCH_H = 0.3;
const HANDS_STAND = 2.4;
const HANDS_JUMP = 0.6;

export interface LobParams {
  /** When he starts to come out, and how fast (m/s) */
  start: number;
  rush: number;
  /** How far off his line he stops (m) */
  stop: number;
  /** When he begins his final charge at you, and how fast */
  charge0: number;
  charge: number;
  /** After the chip: how long before he reacts (s), how fast he gets back (m/s) and how far he can get back (m) */
  react: number;
  back: number;
  backMax: number;
}

export interface LobSample {
  t: number;
  bx: number;
  by: number;
  kx: number;
  /** Where his hands are */
  hands: number;
}

export type LobKind = 'goal' | 'saved' | 'over' | 'short' | 'smothered';

export interface LobResult {
  kind: LobKind;
  /** The ball and the keeper every 0.02 s after the chip, until the end of the move */
  samples: LobSample[];
  /** Metres between the ball and his gloves as it went over him (negative = he got it) */
  clearance: number;
  /** Metres under the bar as it crossed the line */
  underBar: number;
  /** The ball went in after landing in front of the line */
  rolled: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Where the keeper is on his own, before he reacts to a chip. */
export function keeperX(p: LobParams, t: number): number {
  const x0 = G - 1;
  if (t <= p.start) return x0;
  const outDist = Math.min(p.stop, (t - p.start) * p.rush);
  let x = x0 - outDist;
  // he creeps forward once he has set himself
  if (t > p.start + p.stop / p.rush) x -= Math.min(2.2, (t - p.start - p.stop / p.rush) * 0.7);
  // then he comes for you
  if (t > p.charge0) x -= (t - p.charge0) * p.charge;
  return Math.max(0.8, x);
}

/** When he is on top of the striker and the chance is gone. */
export function smotherAt(p: LobParams): number {
  let t = 0;
  while (keeperX(p, t) > 3.4 && t < 12) t += 0.02;
  return t;
}

export const rangeFor = (power: number) => R_MIN + clamp01(power) * (R_MAX - R_MIN);

/** The ball's height after `d` metres, for a chip of range R. */
export const heightAt = (R: number, d: number) => LAUNCH_H + d * Math.tan(ANGLE) * (1 - d / R);

/** The path a chip of this power would take (for the dotted preview). */
export function previewPath(power: number): { x: number; y: number }[] {
  const R = rangeFor(power);
  const out: { x: number; y: number }[] = [];
  for (let d = 0; d <= R + 3 && d <= G + 6; d += 0.5) {
    const y = heightAt(R, d);
    if (y < 0) break;
    out.push({ x: d, y });
  }
  return out;
}

/** What happens when you release a chip of `power` at `tRelease` seconds. */
export function simulateLob(p: LobParams, tRelease: number, power: number, reachBonus = 0): LobResult {
  const samples: LobSample[] = [];
  if (keeperX(p, tRelease) <= 3.4) return { kind: 'smothered', samples, clearance: -1, underBar: 0, rolled: false };

  const R = rangeFor(power);
  const v = Math.sqrt((R * GRAV) / Math.sin(2 * ANGLE));
  const vx = v * Math.cos(ANGLE);
  const vy = v * Math.sin(ANGLE);
  const kx0 = keeperX(p, tRelease);
  // he keeps going the way he was going until he reacts
  const kSpeed = Math.max(0, (keeperX(p, tRelease - 0.1) - kx0) / 0.1);
  let clearance = 9;
  let underBar = 0;
  let kind: LobKind | null = null;
  let rolled = false;
  let crossed = false;

  for (let t = 0; t <= 5; t += 0.02) {
    const bx = vx * t;
    const by = LAUNCH_H + vy * t - 0.5 * GRAV * t * t;
    // the keeper
    let kx: number;
    if (t < p.react) kx = Math.max(0.8, kx0 - kSpeed * t);
    else kx = Math.min(G - 0.5, Math.max(0.8, kx0 - kSpeed * p.react) + Math.min(p.backMax, p.back * (t - p.react)));
    const near = clamp01((6 - Math.abs(kx - bx)) / 4);
    const hands = HANDS_STAND + reachBonus + (t >= p.react ? HANDS_JUMP * near : 0);
    samples.push({ t, bx, by: Math.max(0, by), kx, hands });

    if (kind === null && Math.abs(bx - kx) < 1 && by > 0) {
      const gap = by - hands;
      if (gap < clearance) clearance = gap;
      if (gap < 0) kind = 'saved';
    }
    if (kind === null && !crossed && bx >= G) {
      crossed = true;
      underBar = BAR - by;
      kind = by > BAR ? 'over' : by >= 0 ? 'goal' : null;
    }
    if (kind === null && by <= 0 && t > 0.1) {
      // it dropped before the line: in only if it is close enough to roll in before he gets back
      if (bx >= G - 2.2 && Math.abs(kx - bx) > 2.5) {
        kind = 'goal';
        rolled = true;
      } else kind = 'short';
    }
    if (kind) break;
  }
  return { kind: kind ?? 'short', samples, clearance: clearance === 9 ? 3 : clearance, underBar, rolled };
}

export type LobQuality = 'perfect' | 'good' | 'miss';
export const lobQuality = (r: LobResult): LobQuality => (r.kind !== 'goal' ? 'miss' : !r.rolled && r.clearance >= 0.6 && r.underBar >= 0.25 ? 'perfect' : 'good');

/** The next keeper: quicker, braver and sharper against better teams. */
export function makeLob(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): LobParams {
  return {
    start: 0.45,
    rush: 3.2 + difficulty * 1.1 + rnd() * 0.6,
    stop: Math.max(6, 11 - difficulty * 2.5 - pressure * 1.5 + rnd() * 2.5),
    charge0: 2.6 - difficulty * 0.4 - pressure * 0.2,
    charge: 6.5,
    react: Math.max(0.16, 0.34 - difficulty * 0.08 - pressure * 0.04 - bonus),
    back: 2.8 + difficulty * 0.8,
    backMax: 4.2,
  };
}
