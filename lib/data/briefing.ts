import type { Brief, StanceId } from '../types';
import type { Rng } from '../engine/rng';
import { shuffle } from '../engine/rng';

export interface Instruction {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  effect: Brief;
}

/** The tactical brief that follows the dressing-room talk: three of these are offered each time. */
export const INSTRUCTIONS: Instruction[] = [
  { id: 'free-role', emoji: '🎯', label: 'Free role', hint: 'More freedom: +3 form, but the bar for a good game is higher.', effect: { perf: 3, target: 0.3 } },
  { id: 'high-press', emoji: '🔥', label: 'Press high', hint: 'You start on top of them, but it costs energy.', effect: { momentum: 18, fatigue: 1 } },
  { id: 'compact', emoji: '🧱', label: 'Stay compact', hint: 'Much harder to score against you, fewer chances for you.', effect: { oppRateMul: 0.8, myRateMul: 0.94, perf: -1 } },
  { id: 'counter', emoji: '⚡', label: 'Quick counters', hint: 'Fewer chances, but your big moments are easier.', effect: { clutchBonus: 0.07, myRateMul: 0.9 } },
  { id: 'weak-side', emoji: '🪓', label: 'Attack their weak side', hint: 'More chances both ways.', effect: { myRateMul: 1.14, oppRateMul: 1.08 } },
  { id: 'simple', emoji: '🧭', label: 'Keep it simple', hint: 'A steady performance: small bonus to everything.', effect: { perf: 1, clutchBonus: 0.03 } },
];

/** Offers three different instructions; the stance you took leans which ones show up. */
export function pickInstructions(stance: StanceId, rng: Rng, recent: string[] = []): Instruction[] {
  const lean: Partial<Record<StanceId, string[]>> = {
    'demand-ball': ['free-role', 'weak-side'],
    'challenge-boss': ['free-role', 'counter'],
    'back-boss': ['compact', 'simple'],
    'stay-quiet': ['simple', 'counter'],
    'for-lads': ['high-press', 'weak-side'],
    'crack-joke': ['high-press', 'simple'],
    mentor: ['compact', 'simple'],
  };
  const first = INSTRUCTIONS.filter((i) => lean[stance]?.includes(i.id) && !recent.slice(-2).includes(i.id));
  const rest = INSTRUCTIONS.filter((i) => !first.includes(i));
  const out = [...shuffle(first, rng).slice(0, 1), ...shuffle(rest, rng)].slice(0, 3);
  return shuffle(out, rng);
}
