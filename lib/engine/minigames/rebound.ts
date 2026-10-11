/**
 * Poacher — the rules of the scene, with no drawing in it so they can be tested.
 *
 * Seen from above, the goal at the top. A teammate shoots from outside the box, the keeper parries it and the ball runs loose
 * across the six-yard box: it leaves his gloves in a straight line and slows down on the turf, no tricks. A defender breaks
 * towards it. You steer your striker with your thumb and touch it first, and it is in. Three loose balls, three chances.
 *
 * Coordinates are metres: `x` across the pitch (0 = middle of the goal), `y` the distance from the goal line.
 */
export interface V {
  x: number;
  y: number;
}

export interface ReboundRound {
  /** The teammate who shoots, and where the shot meets the keeper */
  shooter: V;
  hit: V;
  /** Unit direction of the parried ball, its speed off the gloves (m/s) and how fast it slows down (m/s²) */
  dir: V;
  v0: number;
  decel: number;
  /** Seconds until it comes to rest (counted from the parry) */
  tStop: number;
  /** The side of the keeper's dive: where the shot came from */
  keeperSide: 1 | -1;
  /** Where your striker waits */
  me0: V;
  /** The defender who comes for it */
  def0: V;
  defReact: number;
  defSpeed: number;
  /** His path, one point every `DT` seconds from the parry until he reaches the ball */
  defPath: V[];
  /** When he gets to the ball and boots it away */
  tDef: number;
  /** Which way he clears it */
  clearDir: V;
  /** The corner you pick when you get there: away from the keeper */
  corner: V;
  /** The earliest a perfect run could get to the ball (seconds from the parry) */
  tBest: number;
}

export interface ReboundPlan {
  rounds: ReboundRound[];
  /** Your top speed, m/s */
  speed: number;
  /** Seconds a round lasts: the shot, the race and the replay of the result */
  lens: number[];
  /** Seconds before the first shot */
  lead: number;
}

export const ROUNDS = 3;
/** Seconds from the start of a round to the parry: the teammate winds up, then the shot is in the air for `FLIGHT` */
export const PRE = 0.8;
export const FLIGHT = 0.55;
/** How close you must get to the ball to play it (m) */
export const RT = 0.9;
/** How quickly your striker picks up speed: the smaller, the snappier */
export const TAU = 0.14;
/** The area in which everyone plays (m) */
export const FIELD = { xMin: -7.9, xMax: 7.9, yMin: 0.7, yMax: 12.6 };
export const GOAL_HALF = 3.66;
/** Time step of the defender's path */
export const DT = 1 / 60;
/** How long a human takes to react to the parry, for the tuning */
const REACT = 0.3;

export type ReboundVerdict = 'perfect' | 'good' | 'late';

const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const inField = (p: V, pad = 0) => p.x >= FIELD.xMin - pad && p.x <= FIELD.xMax + pad && p.y >= FIELD.yMin - pad && p.y <= FIELD.yMax + pad;

/* ───────── the ball ───────── */

/** Distance rolled along the parry `t` seconds after it. */
const rolled = (r: Pick<ReboundRound, 'v0' | 'decel' | 'tStop'>, t: number) => (t >= r.tStop ? (r.v0 * r.v0) / (2 * r.decel) : r.v0 * t - 0.5 * r.decel * t * t);
/** The loose ball, before anybody touches it. */
export const rollAt = (r: Pick<ReboundRound, 'hit' | 'dir' | 'v0' | 'decel' | 'tStop'>, t: number): V => {
  const s = rolled(r, Math.max(0, t));
  return { x: r.hit.x + r.dir.x * s, y: r.hit.y + r.dir.y * s };
};
/** How fast the loose ball is moving (m/s). */
export const rollSpeed = (r: Pick<ReboundRound, 'v0' | 'decel' | 'tStop'>, t: number) => (t >= r.tStop ? 0 : Math.max(0, r.v0 - r.decel * t));

/* ───────── the defender ───────── */

/** Runs the defender at the ball and returns his path and the time he gets there. */
function chase(
  round: Pick<ReboundRound, 'hit' | 'dir' | 'v0' | 'decel' | 'tStop'>,
  def0: V,
  react: number,
  speed: number,
): { path: V[]; t: number } {
  const path: V[] = [{ ...def0 }];
  let p = { ...def0 };
  let vx = 0;
  let vy = 0;
  const k = 1 - Math.exp(-DT / 0.18);
  for (let t = DT; t < 7; t += DT) {
    if (t > react) {
      const b = rollAt(round, t);
      const d = dist(p, b);
      if (d <= RT) return { path, t };
      const dx = (b.x - p.x) / d;
      const dy = (b.y - p.y) / d;
      vx += (dx * speed - vx) * k;
      vy += (dy * speed - vy) * k;
      p = { x: p.x + vx * DT, y: p.y + vy * DT };
    }
    path.push(p);
  }
  return { path, t: 7 };
}

/** The defender at local time `t`. */
export function defAt(r: ReboundRound, t: number): V {
  if (t <= 0) return r.def0;
  const f = t / DT;
  const i = Math.min(r.defPath.length - 1, Math.floor(f));
  const a = r.defPath[i];
  const b = r.defPath[Math.min(r.defPath.length - 1, i + 1)];
  return { x: lerp(a.x, b.x, f - i), y: lerp(a.y, b.y, f - i) };
}

/* ───────── you ───────── */

export interface Runner extends V {
  vx: number;
  vy: number;
}

/** Moves your striker one step towards where your thumb is: he accelerates smoothly and eases off as he arrives. */
export function stepRunner(me: Runner, target: V | null, dt: number, speed: number): Runner {
  const k = 1 - Math.exp(-dt / TAU);
  let wx = 0;
  let wy = 0;
  if (target) {
    const d = dist(me, target);
    if (d > 0.05) {
      const s = speed * Math.min(1, d / 0.7);
      wx = ((target.x - me.x) / d) * s;
      wy = ((target.y - me.y) / d) * s;
    }
  }
  const vx = me.vx + (wx - me.vx) * k;
  const vy = me.vy + (wy - me.vy) * k;
  return {
    x: clamp(me.x + vx * dt, FIELD.xMin, FIELD.xMax),
    y: clamp(me.y + vy * dt, FIELD.yMin, FIELD.yMax),
    vx,
    vy,
  };
}

/* ───────── the whole picture ───────── */

/** The ball at local time `t` (0 = the parry): the shot coming in, the loose ball, then whoever got there first. */
export function ballAt(r: ReboundRound, t: number, tTouch: number | null): V {
  if (t < -FLIGHT) return r.shooter;
  if (t < 0) {
    const u = (t + FLIGHT) / FLIGHT;
    return { x: lerp(r.shooter.x, r.hit.x, u), y: lerp(r.shooter.y, r.hit.y, u) };
  }
  if (tTouch !== null && t >= tTouch) {
    // you play it first: it flies at the corner, then settles in the net
    const from = rollAt(r, tTouch);
    const d = dist(from, r.corner);
    const u = clamp((t - tTouch - 0.1) / (d / 22), 0, 1);
    const settle = t - tTouch - 0.1 > d / 22 ? Math.min(0.5, (t - tTouch - 0.1 - d / 22) * 1.4) : 0;
    return { x: lerp(from.x, r.corner.x, u), y: lerp(from.y, r.corner.y, u) - settle };
  }
  if (t >= r.tDef) {
    // he boots it away
    const from = rollAt(r, r.tDef);
    const s = Math.min(1.4, (t - r.tDef) * 1) * 11;
    return { x: from.x + r.clearDir.x * s, y: from.y + r.clearDir.y * s };
  }
  return rollAt(r, t);
}

/** What the touch at `tTouch` was worth: first time while it is still rolling is perfect. */
export function judge(r: ReboundRound, tTouch: number | null): ReboundVerdict {
  if (tTouch === null || tTouch >= r.tDef) return 'late';
  return rollSpeed(r, tTouch) >= 0.3 * r.v0 ? 'perfect' : 'good';
}

/* ───────── the next three loose balls ───────── */

const norm = (v: V): V => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};

/** The earliest a runner with a human reaction can be on the ball. */
function bestTime(round: Pick<ReboundRound, 'hit' | 'dir' | 'v0' | 'decel' | 'tStop'>, me0: V, speed: number) {
  for (let t = 0; t < round.tStop + 1.5; t += 0.02) {
    const b = rollAt(round, t);
    if (REACT + TAU * 0.7 + Math.max(0, dist(me0, b) - RT) / speed <= t) return t;
  }
  return round.tStop + 1.5;
}

/** Sharper, quicker defenders against better teams; the stakes tighten the margin. */
export function makeRebound(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): ReboundPlan {
  const speed = 6.3 + bonus * 8;
  const margin = clamp(0.7 - 0.3 * difficulty - 0.1 * pressure + 2.5 * bonus, 0.3, 0.95);
  const rounds: ReboundRound[] = [];
  let prevSide: 1 | -1 | 0 = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const side: 1 | -1 = prevSide === 0 ? (rnd() < 0.5 ? 1 : -1) : (-prevSide as 1 | -1);
    prevSide = side;
    const shooter: V = { x: side * (4.2 + rnd() * 2.2), y: 9.6 + rnd() * 2.4 };
    const hit: V = { x: side * (1.1 + rnd() * 0.9), y: 0.95 };
    // the parry: mostly across the goal, sometimes straight back, now and then wide on his own side
    const kind = rnd();
    const ang = ((kind < 0.12 ? -(6 + rnd() * 14) : 10 + rnd() * 44) * Math.PI) / 180;
    const dir = norm({ x: -side * Math.sin(ang), y: Math.cos(ang) });
    let v0 = 6.3 + rnd() * 2.1;
    const decel = 3.3 + rnd() * 0.5;
    const stopAt = (v: number) => ({ x: hit.x + dir.x * (v * v) / (2 * decel), y: hit.y + dir.y * (v * v) / (2 * decel) });
    while (!inField(stopAt(v0), -0.6) && v0 > 4.5) v0 *= 0.95;
    const base = { hit, dir, v0, decel, tStop: v0 / decel };
    // where you wait: on the edge of the six-yard box, never on the ball's way
    let me0: V = { x: 0, y: 6 };
    let tBest = 0;
    let bestScore = -1;
    for (let k = 0; k < 24; k++) {
      const c: V = { x: (rnd() - 0.5) * 5.6, y: 5.2 + rnd() * 3 };
      const tb = bestTime(base, c, speed);
      // never on the ball's way: you have to move for it
      let near = 99;
      for (let t = 0; t < base.tStop; t += 0.05) near = Math.min(near, dist(c, rollAt(base, t)));
      const score = Math.min(near, 2.8) + Math.min(tb, 1);
      if (score > bestScore) {
        bestScore = score;
        me0 = c;
        tBest = tb;
      }
      if (near > 2.8 && tb >= 0.9) break;
    }
    // the defender: placed so that he arrives `margin` seconds after your best run
    const defSpeed = 5.8 + difficulty * 1;
    const defReact = 0.32 - 0.12 * difficulty;
    const target = tBest + margin;
    const stop = stopAt(v0);
    let best: { def0: V; t: number; path: V[] } | null = null;
    for (let a = 0; a < 28 && !best; a++) {
      const th = rnd() * Math.PI * 2;
      const u = { x: Math.cos(th), y: Math.sin(th) };
      let lo = 1.2;
      let hi = 14;
      let res = chase(base, { x: stop.x + u.x * hi, y: stop.y + u.y * hi }, defReact, defSpeed);
      if (res.t < target) continue; // cannot be slow enough in this direction
      for (let it = 0; it < 12; it++) {
        const mid = (lo + hi) / 2;
        const r2 = chase(base, { x: stop.x + u.x * mid, y: stop.y + u.y * mid }, defReact, defSpeed);
        if (r2.t > target) hi = mid;
        else lo = mid;
      }
      const def0 = { x: stop.x + u.x * hi, y: stop.y + u.y * hi };
      res = chase(base, def0, defReact, defSpeed);
      if (inField(def0, 0.4) && def0.y >= 1.6 && dist(def0, me0) >= 3 && dist(def0, hit) >= 2.2 && Math.abs(res.t - target) < 0.25) best = { def0, t: res.t, path: res.path };
    }
    if (!best) {
      // fall back to a defender coming down from the top of the box
      const def0 = { x: clamp(stop.x + (rnd() < 0.5 ? -1 : 1) * 4, -9, 9), y: clamp(stop.y + 5, 2, 14) };
      const res = chase(base, def0, defReact, defSpeed);
      best = { def0, t: res.t, path: res.path };
    }
    const cx = rnd() < 0.5 ? -1 : 1;
    rounds.push({
      shooter,
      hit,
      dir,
      v0,
      decel,
      tStop: base.tStop,
      keeperSide: side,
      me0,
      def0: best.def0,
      defReact,
      defSpeed,
      defPath: best.path,
      tDef: best.t,
      clearDir: norm({ x: cx * (0.5 + rnd() * 0.5), y: 1 }),
      corner: { x: -side * (2.5 + rnd() * 0.7), y: -0.35 },
      tBest,
    });
  }
  return { rounds, speed, lens: rounds.map((r) => PRE + r.tDef + 1.5), lead: 0.4 };
}
