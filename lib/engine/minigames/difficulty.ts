/**
 * How much of a mini-game's sweet spot is left. Against a weaker side it is generous, in an even match it is the
 * normal size, and it starts shrinking at the first point the opponent is better: 7 % less per point, down to
 * under a third of its size at ten points.
 * `difficulty` follows the gap between the two teams: 0.38 when they are level, 15 points of gap per unit.
 */
export const zoneScale = (difficulty: number, pressure = 0) => {
  const d = difficulty - 0.38;
  const z = d >= 0 ? 1 - 1.05 * d : 1 - 0.6 * d;
  return Math.max(0.3, Math.min(1.3, z - 0.08 * pressure));
};

/** The same for windows measured in time, which a thumb cannot shrink as far as a bar: the square root. */
export const timingScale = (difficulty: number, pressure = 0) => Math.sqrt(zoneScale(difficulty, pressure));
