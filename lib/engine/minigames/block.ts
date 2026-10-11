import { zoneScale } from './difficulty';
/**
 * Block the shot — the rules of the scene, with no drawing in it so they can be tested.
 *
 * You stand in front of the shooter and slide between three lanes (−1 left, 0 centre, 1 right).
 * He winds up and his body shows where he is going to shoot — unless he is dummying. The ball is hit,
 * flies at you, and you must be in its lane when it reaches you. You face three shots.
 */
export type Lane = -1 | 0 | 1;

export interface BlockShot {
  /** Where the ball really goes */
  dir: Lane;
  /** Where his body says it goes (a dummy when different from dir) */
  tell: Lane;
}

export interface BlockPlan {
  shots: BlockShot[];
  /** Seconds from the start of a shot to the strike */
  windup: number;
  /** Seconds the ball takes to reach you */
  flight: number;
  /** Seconds the result stays on screen */
  after: number;
  /** How fast you slide, in lanes per second */
  speed: number;
  /** How far from the ball's lane your body still blocks it, in lanes */
  reach: number;
}

export const SHOTS = 3;
/** Between the strike and the ball leaving his foot */
export const STRIKE = 0.1;

export const shotStart = (p: BlockPlan, i: number) => i * (p.windup + STRIKE + p.flight + p.after);
export const shotLaunch = (p: BlockPlan, i: number) => shotStart(p, i) + p.windup + STRIKE;
export const shotArrive = (p: BlockPlan, i: number) => shotLaunch(p, i) + p.flight;
export const planEnd = (p: BlockPlan) => shotStart(p, SHOTS);

/** Slide towards a lane at a constant speed; never overshoot. */
export const moveToward = (pos: number, target: number, dt: number, speed: number) => {
  const d = target - pos;
  const step = speed * dt;
  return Math.abs(d) <= step ? target : pos + Math.sign(d) * step;
};

/** Is the ball stopped? `dist` is how far off you were, in lanes. */
export const judgeBlock = (pos: number, dir: Lane, reach: number) => ({ ok: Math.abs(pos - dir) <= reach, dist: Math.abs(pos - dir) });

/** Perfect = three blocks, good = two. */
export const blockQuality = (blocked: number): 'perfect' | 'good' | 'miss' => (blocked >= SHOTS ? 'perfect' : blocked === SHOTS - 1 ? 'good' : 'miss');

/** The three shots of the next scene: better strikers dummy more and hit it quicker. */
export function makeBlock(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): BlockPlan {
  const lanes: Lane[] = [-1, 0, 1];
  const shots: BlockShot[] = [];
  let prev: Lane | null = null;
  for (let i = 0; i < SHOTS; i++) {
    // never the same corner twice in a row, so you cannot just stay put
    const pool = lanes.filter((l) => l !== prev);
    const dir = pool[Math.floor(rnd() * pool.length)];
    const dummy = i > 0 && rnd() < 0.08 + difficulty * 0.28 + pressure * 0.1 - bonus;
    const others = lanes.filter((l) => l !== dir);
    shots.push({ dir, tell: dummy ? others[Math.floor(rnd() * others.length)] : dir });
    prev = dir;
  }
  return {
    shots,
    windup: 1.15,
    flight: Math.max(0.5, 0.86 - difficulty * 0.2 - pressure * 0.08 + bonus),
    after: 0.85,
    speed: 4.4 + bonus * 6,
    reach: (0.56 + bonus * 2) * (0.6 + 0.4 * zoneScale(difficulty, pressure)),
  };
}
