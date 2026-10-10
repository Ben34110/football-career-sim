/**
 * Sliding tackle — the rules of the scene, with no drawing in it so they can be tested.
 *
 * An attacker dribbles from the left towards you. He pushes the ball ahead of him every `period`
 * seconds, then reels it back in, so the ball is only far from his feet for a short moment.
 * You slide to the left: your leg reaches `reach` units over `slideTime` seconds, then stays out.
 * What your leg meets first (the ball or his feet) and how fast it is moving decides the result.
 */
export interface SlideParams {
  /** Attacker's speed (units / s) */
  speed: number;
  /** Seconds between two touches */
  period: number;
  /** Largest distance between ball and feet right after a touch */
  maxOff: number;
  /** Where your standing leg is */
  xD: number;
  /** Attacker's starting position */
  start: number;
  reach: number;
  slideTime: number;
  /** Phase shift of the touch rhythm */
  phase: number;
  /** Which touches are cut-backs (the ball goes behind the feet): indexes */
  dragBacks: number[];
}

export type SlideOutcome =
  | { kind: 'clean'; t: number } // won the ball
  | { kind: 'nick'; t: number } // won the ball, but only just
  | { kind: 'late'; t: number; card: 'yellow' | 'red' } // hit the man, not the ball
  | { kind: 'miss'; t: number }; // never got there

const ease = (x: number) => 1 - (1 - x) * (1 - x);

export const feetX = (p: SlideParams, t: number) => p.start + p.speed * t;

/** Ball minus feet, in units: positive = ahead of him (towards you), negative = a cut-back behind his feet. */
export function ballOffset(p: SlideParams, t: number): number {
  const u = (t + p.phase) / p.period;
  const n = Math.floor(u);
  const f = u - n;
  if (p.dragBacks.includes(n)) {
    // the ball is dragged back across his body, then he is away again
    return -p.maxOff * 0.55 * Math.sin(Math.min(1, f * 1.4) * Math.PI) + (f > 0.7 ? 2 * (f - 0.7) : 0);
  }
  return p.maxOff * (1 - f) * (1 - f);
}

export const legX = (p: SlideParams, tTap: number, t: number) => p.xD - p.reach * ease(Math.max(0, Math.min(1, (t - tTap) / p.slideTime)));

/** What happens if you slide at `tTap` (seconds after the start), or never (null). */
export function simulateSlide(p: SlideParams, tTap: number | null, dt = 0.004): SlideOutcome {
  const tEnd = (p.xD + 40 - p.start) / p.speed;
  if (tTap === null || tTap > tEnd) return { kind: 'miss', t: tEnd };
  const hold = 0.5;
  for (let t = tTap; t <= Math.min(tEnd, tTap + p.slideTime + hold); t += dt) {
    const f = feetX(p, t);
    const off = ballOffset(p, t);
    const ball = f + off;
    const leg = legX(p, tTap, t);
    if (ball >= leg) {
      const extending = t - tTap < p.slideTime * 0.85;
      // the ball arrives first
      if (off >= 11) return { kind: 'clean', t };
      if (off >= 5) return { kind: 'nick', t };
      // the leg meets the man: a reckless, fast challenge from the front is worse than a trip over a still leg
      const red = (off < 0 && extending) || (off < 1.5 && extending && p.speed > 150);
      return { kind: 'late', t, card: red ? 'red' : 'yellow' };
    }
    // he has gone past your leg line without touching it
    if (f - 4 > p.xD) break;
  }
  return { kind: 'miss', t: tEnd };
}

/** The rhythm of the next attacker: faster and trickier under pressure and against better teams. */
export function makeSlide(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): SlideParams {
  const speed = 92 + pressure * 26 + difficulty * 26 + rnd() * 12;
  const period = 0.78 - difficulty * 0.1 - pressure * 0.05 + (rnd() - 0.5) * 0.06;
  return {
    speed,
    period,
    maxOff: 30 + bonus * 40,
    xD: 258,
    start: 24,
    reach: 62 + bonus * 60,
    slideTime: 0.3,
    phase: rnd() * period * 0.9,
    // better opposition cuts back more often
    dragBacks: [1, 2, 3].filter(() => rnd() < 0.12 + difficulty * 0.3),
  };
}
