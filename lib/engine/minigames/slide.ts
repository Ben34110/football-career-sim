/**
 * Sliding tackle — the rules of the scene, with no drawing in it so they can be tested.
 *
 * An attacker dribbles at you from the left. The pitch shows a TACKLE ZONE: when the ball is inside it
 * and you slide, your leg arrives exactly where the ball is. Slide before the zone and he skips over your
 * leg (no card, no ball); slide after it and you hit the man (yellow card, or red if it is really late).
 *
 * Everything is a function of time, so the picture can be drawn, slowed down or replayed from any instant.
 */
export interface SlideParams {
  /** Running speed (units / s) */
  v: number;
  /** Where the ball is at t = 0 */
  xStart: number;
  /** A hesitation: he slows down at this x (null = he never does) */
  xHold: number | null;
  /** How long it lasts (s) */
  hold: number;
  /** Speed factor after the hesitation */
  burst: number;
  /** Where you stand */
  xD: number;
  /** How far the slide carries you */
  reach: number;
  slideTime: number;
  /** Half-width (in seconds) of the perfect window, of the winning window, and the extra time before a yellow becomes a red */
  tp: number;
  tg: number;
  tr: number;
  /** The best moment to slide, in seconds after the start */
  ideal: number;
}

export type SlideOutcome =
  | { kind: 'clean'; t: number } // won the ball, perfect timing
  | { kind: 'nick'; t: number } // won the ball, but only just
  | { kind: 'late'; t: number; card: 'yellow' | 'red' } // hit the man, not the ball
  | { kind: 'early'; t: number } // slid too soon: he skips over your leg
  | { kind: 'miss'; t: number }; // never slid in time: he is past you

/** Ball radius, distance from his feet to the ball, and how far the toe sticks out ahead of the lying body */
export const BALL_R = 8;
export const LEAD = 14;
export const TOE = 25;
/** The slide reaches the ball this far (as a share of the slide) into the movement */
const CONTACT_AT = 0.7;
/** Seconds the body takes to go from standing to lying */
export const DROP = 0.12;

const ease = (x: number) => 1 - (1 - x) * (1 - x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** The ball (its centre) at time t. */
export function ballX(p: SlideParams, t: number): number {
  if (p.xHold === null) return p.xStart + p.v * t;
  const t1 = (p.xHold - p.xStart) / p.v;
  if (t < t1) return p.xStart + p.v * t;
  const slow = 0.15 * p.v;
  if (t < t1 + p.hold) return p.xHold + slow * (t - t1);
  return p.xHold + slow * p.hold + p.v * p.burst * (t - t1 - p.hold);
}

export const feetX = (p: SlideParams, t: number) => ballX(p, t) - LEAD;

/** The centre of your body at time t when you slid at tTap (standing still at xD before that). */
export const bodyX = (p: SlideParams, tTap: number, t: number) => p.xD - p.reach * ease(clamp01((t - tTap) / p.slideTime));

/** The tip of your boot. */
export const tipX = (p: SlideParams, tTap: number, t: number) => bodyX(p, tTap, t) - TOE * clamp01((t - tTap) / DROP);

/** First instant the ball has crossed the area of the pitch, in seconds. */
const timeAt = (p: SlideParams, x: number) => {
  let t = 0;
  while (ballX(p, t) < x && t < 20) t += 0.004;
  return t;
};

/** The moment he is level with you: the scene is over. */
export const passTime = (p: SlideParams) => timeAt(p, p.xD - 6);

/** What happens if you slide at `tTap` (seconds after the start), or never (null). */
export function simulateSlide(p: SlideParams, tTap: number | null): SlideOutcome {
  const tPass = passTime(p);
  if (tTap === null || ballX(p, tTap) + BALL_R >= p.xD - 4) return { kind: 'miss', t: tPass };
  const e = tTap - p.ideal;
  if (e < -p.tg) return { kind: 'early', t: tPass };
  // the instant your boot meets the ball
  let tc = tTap + p.slideTime * CONTACT_AT;
  for (let t = tTap; t <= tTap + p.slideTime + 0.3; t += 0.004) {
    if (ballX(p, t) + BALL_R >= tipX(p, tTap, t)) {
      tc = t;
      break;
    }
  }
  if (Math.abs(e) <= p.tp) return { kind: 'clean', t: tc };
  if (Math.abs(e) <= p.tg) return { kind: 'nick', t: tc };
  return { kind: 'late', t: tc, card: e > p.tg + p.tr ? 'red' : 'yellow' };
}

/** Where the ball is (centre) when you tap, for each frontier of the zone — what the pitch draws. */
export function zones(p: SlideParams) {
  const x = (e: number) => ballX(p, p.ideal + e);
  return {
    good0: x(-p.tg),
    perfect0: x(-p.tp),
    perfect1: x(p.tp),
    good1: x(p.tg),
    yellow1: x(p.tg + p.tr),
    /** red until he is on top of you */
    red1: Math.min(p.xD - 8, x(p.tg + p.tr + 0.2)),
  };
}

/** The next attacker: faster and trickier under pressure and against better teams. */
export function makeSlide(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): SlideParams {
  const hesitates = rnd() < 0.2 + difficulty * 0.5;
  const p: SlideParams = {
    v: 96 + pressure * 20 + difficulty * 30 + rnd() * 10,
    xStart: 26,
    xHold: hesitates ? 60 + rnd() * 20 : null,
    hold: 0.35 + rnd() * 0.15,
    burst: 1.22,
    xD: 268,
    reach: 52 + bonus * 60,
    slideTime: 0.3,
    tg: 0.15 - difficulty * 0.03 - pressure * 0.015 + bonus * 0.4,
    tp: 0,
    tr: 0.14,
    ideal: 0,
  };
  p.tp = p.tg * 0.4;
  // solve: the tip is on the ball CONTACT_AT through the slide
  const f = (tt: number) => ballX(p, tt + p.slideTime * CONTACT_AT) + BALL_R - tipX(p, tt, tt + p.slideTime * CONTACT_AT);
  let lo = 0;
  let hi = 10;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  p.ideal = (lo + hi) / 2;
  return p;
}
