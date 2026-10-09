export type Rng = () => number;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const chance = (p: number, rng: Rng = Math.random) => rng() < p;

export const rand = (min: number, max: number, rng: Rng = Math.random) => min + (max - min) * rng();

export const randInt = (min: number, max: number, rng: Rng = Math.random) =>
  Math.floor(rand(min, max + 1, rng));

export function weightedPick<T>(items: readonly T[], weight: (item: T) => number, rng: Rng = Math.random): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** Deterministic RNG for tests/simulations */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
