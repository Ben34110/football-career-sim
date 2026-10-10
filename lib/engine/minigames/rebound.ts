/**
 * Poacher — the rules of the scene, with no drawing in it so they can be tested.
 *
 * A shot has just been saved: the ball drops, bounces off the turf and pops out towards one of three lanes of the six-yard box.
 * You slide to that lane and pounce on it before a defender gets there to clear. Three loose balls, three chances.
 *
 * Coordinates: `x` is the lane (−1 left … 1 right, continuous), `d` the depth (0 on the goal line … 1 at your feet), `h` the height in metres.
 */
export type Lane = -1 | 0 | 1;

export interface ReboundRound {
  /** Where the ball finally settles */
  lane: Lane;
  /** Where it bounces first (a hint to read) */
  bounceX: number;
  /** Seconds, from the saved shot: first bounce, second touch of the turf (the ball is loose from here) */
  t1: number;
  t2: number;
  /** How long it stays loose before a defender clears it */
  win: number;
  /** The best moment to pounce */
  ideal: number;
  /** Which way the clearance goes */
  clearSide: 1 | -1;
  /** The side the keeper dived to */
  keeperSide: 1 | -1;
  /** The side the shot came from */
  shotSide: 1 | -1;
}

export interface ReboundPlan {
  rounds: ReboundRound[];
  /** How far from the ball's lane your body still gets to it, in lanes */
  reach: number;
  /** Half-width of the "perfect" window in seconds */
  perfect: number;
  /** Seconds a round lasts, counting the replay of the result */
  roundLen: number;
  /** Seconds before the first shot */
  lead: number;
}

export const ROUNDS = 3;
/** Seconds before the save in which you see the shot coming in */
export const PRE = 0.55;

export const tClear = (r: ReboundRound) => r.t2 + r.win;

export type ReboundVerdict = 'perfect' | 'good' | 'early' | 'late' | 'wrong';

/** Seconds the poacher takes to sprint to the lane you pick */
export const DASH = 0.32;

/** When he gets his boot to the ball: as soon as he arrives, but never before it has landed. */
export const strikeAt = (r: ReboundRound, tTap: number) => Math.max(tTap + DASH, r.t2 - 0.02);

/**
 * One tap picks the lane where you think the ball will drop; he sprints there on his own.
 * Right lane and there in time: a goal (perfect if he is there as it lands). Wrong lane: nothing. Too slow: a defender clears.
 */
export function judgeDash(r: ReboundRound, lane: Lane, tTap: number): ReboundVerdict {
  if (lane !== r.lane) return 'wrong';
  if (tTap + DASH > tClear(r) - 0.02) return 'late';
  return tTap + DASH <= r.t2 + 0.14 ? 'perfect' : 'good';
}

/** What a pounce at local time `tp` (seconds since this round's shot) gives when you stand at `pos`. */
export function judgePounce(r: ReboundRound, plan: ReboundPlan, pos: number, tp: number): ReboundVerdict {
  if (Math.abs(pos - r.lane) > plan.reach) return 'wrong';
  if (tp < r.t2 - 0.06) return 'early';
  if (tp > tClear(r)) return 'late';
  return Math.abs(tp - r.ideal) <= plan.perfect ? 'perfect' : 'good';
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** The ball before anyone touches it again: the drop, the first bounce, the second, then rolling loose, then cleared. */
export function ballAt(r: ReboundRound, t: number): { x: number; d: number; h: number; cleared: boolean } {
  const tc = tClear(r);
  if (t < -PRE) return { x: r.shotSide * 3.4, d: 0.7, h: 0.25, cleared: false };
  if (t <= 0) {
    // the shot, driven in from the side, a little above the grass
    const u = (t + PRE) / PRE;
    return { x: lerp(r.shotSide * 3.4, 0, u), d: lerp(0.7, 0.03, u), h: lerp(0.25, 0.9, u), cleared: false };
  }
  if (t < r.t1) {
    const u = t / r.t1;
    return { x: lerp(0, r.bounceX, u), d: lerp(0.03, 0.36, u), h: 0.9 * (1 - u * u), cleared: false };
  }
  if (t < r.t2) {
    const u = (t - r.t1) / (r.t2 - r.t1);
    return { x: lerp(r.bounceX, r.lane, u), d: lerp(0.36, 0.76, u), h: 0.85 * 4 * u * (1 - u), cleared: false };
  }
  if (t < tc) {
    const u = (t - r.t2) / r.win;
    // a couple of little hops as it rolls on
    const hop = 0.16 * Math.abs(Math.sin((t - r.t2) * 14)) * Math.exp(-(t - r.t2) * 6);
    return { x: r.lane, d: 0.76 + 0.07 * u, h: hop, cleared: false };
  }
  // the defender hoofs it away
  const u = clamp01((t - tc) / 0.9);
  return { x: r.lane + r.clearSide * 3.2 * u, d: 0.83 + 0.2 * u, h: 3 * Math.sin(Math.PI * u) + 0.1, cleared: true };
}

/** The ball after you strike it at `tp`: it leaves the spot and flies into the far corner, away from the keeper. */
export function shotAt(r: ReboundRound, tp: number, t: number): { x: number; d: number; h: number } {
  const from = ballAt(r, tp + 0.08);
  const u = clamp01((t - (tp + 0.08)) / 0.4);
  const e = 1 - Math.pow(1 - u, 2);
  const target = -r.keeperSide * 0.72;
  return { x: lerp(from.x, target, e), d: lerp(from.d, 0.0, e), h: lerp(from.h, 0.9, e) + 0.35 * Math.sin(Math.PI * e) };
}

/** The next three loose balls: sharper defenders and quicker bounces against better teams. */
export function makeRebound(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): ReboundPlan {
  const lanes: Lane[] = [-1, 0, 1];
  const rounds: ReboundRound[] = [];
  let prev: Lane | null = null;
  for (let i = 0; i < ROUNDS; i++) {
    // never twice the same lane in a row
    const pool = lanes.filter((l) => l !== prev);
    const lane = pool[Math.floor(rnd() * pool.length)];
    const t1 = 0.5 - difficulty * 0.06;
    const t2 = t1 + 0.62 - difficulty * 0.1 - pressure * 0.05;
    const win = Math.max(0.42, 0.78 - difficulty * 0.2 - pressure * 0.1 + bonus * 2);
    // the first bounce is on the opposite side more often than not: a ricochet, not a straight line
    const bounceX = lane === 0 ? (rnd() < 0.5 ? -0.8 : 0.8) : rnd() < 0.7 ? -lane * 0.6 : lane * 0.3;
    rounds.push({ lane, bounceX, t1, t2, win, ideal: t2 + Math.min(0.14, win * 0.3), clearSide: rnd() < 0.5 ? 1 : -1, keeperSide: bounceX < 0 ? 1 : -1, shotSide: rnd() < 0.5 ? 1 : -1 });
    prev = lane;
  }
  const slowest = Math.max(...rounds.map((r) => tClear(r)));
  return { rounds, reach: 0.62, perfect: 0.11 + bonus * 0.8, roundLen: slowest + 1.15 + PRE, lead: 0.5 + PRE };
}
