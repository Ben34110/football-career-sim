import { timingScale } from './difficulty';
/**
 * Volley — the rules of the scene, with no drawing in it so they can be tested.
 *
 * A cross drops towards you. Your leg needs `SWING` seconds to get through, so you start the swing a touch before
 * the ball reaches the spot where your boot will meet it. Everything is a function of time: the ball, the leg and the result.
 */

/** Seconds from the tap to the boot meeting the ball */
export const SWING = 0.14;
/** The leg pose when the boot hits the ball (0 = rest, −1 = fully cocked, 1 = followed through) */
export const CONTACT_K = 0.55;

const THIGH = 11;
const SHANK = 11;
const HIP: [number, number] = [0, -21];

const smooth = (x: number) => {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** The kicking leg for a pose k in −1…1: thigh angle from the vertical (forward is positive) and how much the knee is bent. */
export function legPose(k: number): { thigh: number; flex: number } {
  const thigh = -0.5 + 2.05 * smooth((k + 1) / 2);
  // folded up behind you when cocked, straight as the boot meets the ball, a little bent in the follow-through
  const flex = k < 0 ? lerp(1.9, 1.1, (k + 1)) : k < CONTACT_K ? lerp(1.1, 0.12, k / CONTACT_K) : lerp(0.12, 0.5, (k - CONTACT_K) / (1 - CONTACT_K));
  return { thigh, flex };
}

/** Where the boot is for a pose k, in the figure's own units (feet at the origin, facing +x). */
export function footAt(k: number): [number, number] {
  const { thigh, flex } = legPose(k);
  const knee: [number, number] = [HIP[0] + THIGH * Math.sin(thigh), HIP[1] + THIGH * Math.cos(thigh)];
  const sa = thigh - flex;
  return [knee[0] + SHANK * Math.sin(sa), knee[1] + SHANK * Math.cos(sa)];
}

export interface VolleyParams {
  /** Where the cross starts, and its velocity (px / s); gravity pulls down */
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  g: number;
  /** The ground, for the ball's centre */
  floor: number;
  /** The spot (ball centre) where the boot meets it, and when the ball gets there */
  xc: number;
  yc: number;
  tIdeal: number;
  /** Half-widths of the perfect and the good windows, in seconds */
  perfect: number;
  good: number;
}

export type VolleyOutcome =
  | { kind: 'perfect' | 'good'; tContact: number }
  | { kind: 'early' | 'late'; tContact: number }
  | { kind: 'none'; tContact: number };

/** The ball in the air (and its bounces). */
export function ballAt(p: VolleyParams, t: number): { x: number; y: number; onGround: boolean } {
  const x = p.x0 + p.vx * t;
  let y = p.y0 + p.vy * t + 0.5 * p.g * t * t;
  if (y < p.floor) return { x, y, onGround: false };
  // first time it reaches the floor
  const disc = p.vy * p.vy - 2 * p.g * (p.y0 - p.floor);
  const tHit = (-p.vy + Math.sqrt(Math.max(0, disc))) / p.g;
  const vHit = (p.vy + p.g * tHit) * 0.5;
  const u = t - tHit;
  // damped bounces
  let v = vHit;
  let tt = u;
  for (let i = 0; i < 4; i++) {
    const flight = (2 * v) / p.g;
    if (tt <= flight) {
      y = p.floor - (v * tt - 0.5 * p.g * tt * tt);
      return { x, y, onGround: tt < 0.02 };
    }
    tt -= flight;
    v *= 0.5;
  }
  return { x, y: p.floor, onGround: true };
}

/** When the ball reaches the contact spot, scanning the descent. */
const timeAtSpot = (p: VolleyParams) => {
  const apex = -p.vy / p.g;
  for (let t = Math.max(0, apex); t < 4; t += 0.002) if (p.y0 + p.vy * t + 0.5 * p.g * t * t >= p.yc) return t;
  return 1;
};

/** What happens if you start the swing at tTap (seconds since the cross), or never (null). */
export function simulateVolley(p: VolleyParams, tTap: number | null): VolleyOutcome {
  if (tTap === null) return { kind: 'none', tContact: p.tIdeal + 0.6 };
  const tContact = tTap + SWING;
  const e = tContact - p.tIdeal;
  if (Math.abs(e) <= p.perfect) return { kind: 'perfect', tContact };
  if (Math.abs(e) <= p.good) return { kind: 'good', tContact };
  return { kind: e < 0 ? 'early' : 'late', tContact };
}

/** The next cross: quicker and tighter against better teams. */
export function makeVolley(pressure: number, difficulty: number, bonus: number, floor: number, xc: number, yc: number, rnd: () => number = Math.random): VolleyParams {
  const fall = 1.2 - difficulty * 0.12 - pressure * 0.06 + rnd() * 0.18;
  const g = 640;
  // it comes down almost vertically in front of him, well clear of his body
  const x0 = xc + 72 + rnd() * 30;
  const y0 = 52 + rnd() * 20;
  const vx = (xc - x0) / fall;
  const vy = (yc - y0 - 0.5 * g * fall * fall) / fall;
  const p: VolleyParams = { x0, y0, vx, vy, g, floor, xc, yc, tIdeal: fall, perfect: (0.05 + bonus * 0.45) * timingScale(difficulty, pressure), good: (0.12 + bonus * 0.7) * timingScale(difficulty, pressure) };
  p.tIdeal = timeAtSpot(p);
  return p;
}
