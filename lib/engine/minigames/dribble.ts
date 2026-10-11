/**
 * Take on the last man — the rules of the scene, with no drawing in it so they can be tested.
 *
 * You run at goal with the ball. Waves of defenders come down the pitch, each leaving at least one lane open.
 * Slide across to the open lane before the wave reaches you; every defender you run into costs you a touch.
 */
export type Lane = -1 | 0 | 1;

export interface DribbleWave {
  /** The lanes with a defender in them */
  blocked: Lane[];
  /** The lane left open */
  open: Lane;
}

export interface DribblePlan {
  waves: DribbleWave[];
  /** Seconds a wave takes from the far end to you */
  travel: number;
  /** Seconds between two waves */
  gap: number;
  /** How far from a defender's lane your body still runs into him, in lanes */
  reach: number;
}

export const WAVES = 6;
/** Seconds the scene runs on after the last wave reaches you */
export const RUN_OUT = 0.8;

export const waveArrive = (p: DribblePlan, i: number) => i * p.gap + p.travel;
/** 0 at the far end … 1 at your lane */
export const waveDepth = (p: DribblePlan, i: number, t: number) => (t - i * p.gap) / p.travel;
export const planEnd = (p: DribblePlan) => waveArrive(p, WAVES - 1) + RUN_OUT;

/** Does the wave catch you where you are? */
export const caught = (w: DribbleWave, pos: number, reach: number) => w.blocked.some((l) => Math.abs(pos - l) < reach);

/** No hit = perfect, one = good. */
export const dribbleQuality = (hits: number): 'perfect' | 'good' | 'miss' => (hits === 0 ? 'perfect' : hits === 1 ? 'good' : 'miss');

/** Follow a target smoothly (an ease that never overshoots), with a cap on the speed. */
export const glide = (pos: number, target: number, dt: number, rate = 14, maxSpeed = 8) => {
  const step = (target - pos) * (1 - Math.exp(-rate * dt));
  const cap = maxSpeed * dt;
  return pos + Math.max(-cap, Math.min(cap, step));
};

/** The next run: better teams close faster and leave less room. */
export function makeDribble(pressure: number, difficulty: number, bonus: number, rnd: () => number = Math.random): DribblePlan {
  const lanes: Lane[] = [-1, 0, 1];
  const waves: DribbleWave[] = [];
  let prevOpen: Lane = 0;
  for (let i = 0; i < WAVES; i++) {
    // the gap can be anywhere, but never right where you are standing at the start of the run
    const pool = i === 0 ? lanes.filter((l) => l !== 0) : lanes.filter((l) => l !== prevOpen || rnd() < 0.2);
    const open = pool[Math.floor(rnd() * pool.length)];
    const single = i < 2 && rnd() < 0.55;
    const blocked = lanes.filter((l) => l !== open && (!single || l === (open === 0 ? (rnd() < 0.5 ? -1 : 1) : 0)));
    waves.push({ blocked: blocked.length ? blocked : lanes.filter((l) => l !== open), open });
    prevOpen = open;
  }
  return {
    waves,
    travel: Math.max(0.58, 1.02 - difficulty * 0.2 - pressure * 0.1 + bonus * 1.1),
    gap: Math.max(0.58, 0.88 - difficulty * 0.14 - pressure * 0.08),
    reach: 0.55,
  };
}
