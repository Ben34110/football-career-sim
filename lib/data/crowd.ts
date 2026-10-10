export interface Fan {
  x: number;
  y: number;
  r: number;
  skin: string;
  shirt: string;
  /** Arms raised (celebrating) */
  arms: boolean;
}

const SKINS = ['#f1c9a5', '#c68642', '#8d5524', '#e0ac69', '#5c3a21', '#ffdbac'];
const ROWS = [
  { y: 0.4, r: 0.034 },
  { y: 0.55, r: 0.04 },
  { y: 0.7, r: 0.048 },
  { y: 0.86, r: 0.057 },
  { y: 1.04, r: 0.068 },
];

/** A packed stand: rows of supporters from far to near, dressed mostly in the club's colour. */
export function crowdFor(width: number, height: number, kit: string, joy: boolean): Fan[] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const shirts = [kit, kit, kit, '#f4f4f5', '#27272a', '#fbbf24', '#ef4444', '#3b82f6'];
  const fans: Fan[] = [];
  ROWS.forEach((row, ri) => {
    const r = row.r * width;
    const step = r * 2.5;
    for (let x = -r + (ri % 2) * (step / 2); x < width + r; x += step) {
      fans.push({
        x: x + (rnd() - 0.5) * r * 0.8,
        y: row.y * height + (rnd() - 0.5) * r * 0.5,
        r: r * (0.9 + rnd() * 0.25),
        skin: SKINS[Math.floor(rnd() * SKINS.length)],
        shirt: shirts[Math.floor(rnd() * shirts.length)],
        arms: joy && rnd() < 0.35,
      });
    }
  });
  return fans;
}
