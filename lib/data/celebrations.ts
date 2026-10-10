import type { TrophyKind } from '@/components/celebration/TrophyArt';

export type CelebrationScenario = 'league' | 'cup' | 'champions' | 'europa' | 'continental' | 'worldcup' | 'olympic' | 'ballon';

export interface Palette {
  /** Night sky, top → horizon */
  sky: [string, string, string];
  /** Light beams and glow */
  glow: string;
  /** Pitch / stage floor */
  floor: string;
}

export interface CelebrationEvent {
  id: number;
  scenario: CelebrationScenario;
  /** The trophy as stored in the cabinet ("League Title 2026/27") */
  trophy: string;
  /** Club or nation lifting it */
  team: string;
  /** Shirt colour of your side */
  kit: string;
  /** Alone on a stage (Ballon d'Or) instead of with the squad */
  solo: boolean;
  trophyKind: TrophyKind;
  /** Ribbon / base colour for the cups that have one */
  accent: string;
}

export const PALETTE: Record<CelebrationScenario, Palette> = {
  league: { sky: ['#06122b', '#0f2d5c', '#1b5a8a'], glow: '#7dd3fc', floor: '#0e5d3a' },
  cup: { sky: ['#14082e', '#3a1466', '#7a2d86'], glow: '#f0abfc', floor: '#0e5d3a' },
  champions: { sky: ['#020617', '#0b1a4d', '#1d3a9e'], glow: '#93c5fd', floor: '#0b5236' },
  europa: { sky: ['#1a0a02', '#4a1d06', '#a24a0c'], glow: '#fdba74', floor: '#0b5236' },
  continental: { sky: ['#03150d', '#0b3b25', '#157a47'], glow: '#86efac', floor: '#0e5d3a' },
  worldcup: { sky: ['#0a0720', '#251a5c', '#6b3fa0'], glow: '#fde68a', floor: '#0b5236' },
  olympic: { sky: ['#06142a', '#14407a', '#3b82c4'], glow: '#fef3c7', floor: '#7c2d12' },
  ballon: { sky: ['#050505', '#1a1407', '#3b2a0a'], glow: '#fbbf24', floor: '#450a0a' },
};

/** Competition colours for the continental cups. */
const ACCENT: [RegExp, string][] = [
  [/Africa/, '#16a34a'],
  [/European/, '#1d4ed8'],
  [/Copa/, '#eab308'],
  [/Asian/, '#dc2626'],
  [/Gold Cup/, '#f59e0b'],
];

/**
 * Which ceremony a trophy deserves. `club` is where you play, `nation` your country (for tournaments).
 * Returns null for anything that is not worth a celebration.
 */
export function celebrationFor(trophy: string, ctx: { club: string; kit: string; nation: string; nationKit?: string }): Omit<CelebrationEvent, 'id'> | null {
  const club = { team: ctx.club, kit: ctx.kit };
  if (/^League Title/.test(trophy)) return { scenario: 'league', trophy, ...club, solo: false, trophyKind: 'league', accent: '#16a34a' };
  if (/^Domestic Cup/.test(trophy)) return { scenario: 'cup', trophy, ...club, solo: false, trophyKind: 'cup', accent: '#16a34a' };
  if (/^Champions League/.test(trophy)) return { scenario: 'champions', trophy, ...club, solo: false, trophyKind: 'bigears', accent: '#1d4ed8' };
  if (/^Europa League/.test(trophy)) return { scenario: 'europa', trophy, ...club, solo: false, trophyKind: 'europa', accent: '#ea580c' };
  if (/^Ballon/.test(trophy)) return { scenario: 'ballon', trophy, ...club, solo: true, trophyKind: 'ballon', accent: '#fbbf24' };
  const nation = { team: ctx.nation, kit: ctx.nationKit ?? '#fbbf24' };
  if (/World Cup/.test(trophy)) return { scenario: 'worldcup', trophy, ...nation, solo: false, trophyKind: 'globe', accent: '#16a34a' };
  if (/Olympic/.test(trophy)) return { scenario: 'olympic', trophy, ...nation, solo: false, trophyKind: 'medal', accent: '#2563eb' };
  if (/Championship|Cup of Nations|Copa|Asian Cup|Gold Cup/.test(trophy)) {
    const accent = ACCENT.find(([re]) => re.test(trophy))?.[1] ?? '#16a34a';
    return { scenario: 'continental', trophy, ...nation, solo: false, trophyKind: 'continental', accent };
  }
  return null;
}

/** The headline word of each ceremony. */
export const HEADLINE: Record<CelebrationScenario, string> = {
  league: 'CHAMPIONS',
  cup: 'CUP WINNERS',
  champions: 'KINGS OF EUROPE',
  europa: 'EUROPA LEAGUE WINNERS',
  continental: 'CONTINENTAL CHAMPIONS',
  worldcup: 'WORLD CHAMPIONS',
  olympic: 'OLYMPIC GOLD',
  ballon: 'BEST PLAYER IN THE WORLD',
};

const NATION_KIT: Record<string, string> = {
  FRA: '#1d4ed8', SEN: '#16a34a', BRA: '#fbbf24', ARG: '#7dd3fc', GER: '#f4f4f5', ESP: '#dc2626', ENG: '#f4f4f5', ITA: '#2563eb', POR: '#b91c1c',
  NED: '#f97316', BEL: '#b91c1c', CRO: '#dc2626', MAR: '#b91c1c', EGY: '#dc2626', ALG: '#16a34a', TUN: '#dc2626', NGA: '#16a34a', GHA: '#fbbf24',
  CIV: '#f97316', CMR: '#16a34a', MLI: '#16a34a', JPN: '#2563eb', KOR: '#dc2626', USA: '#1e3a8a', MEX: '#15803d', COL: '#fbbf24', URU: '#7dd3fc',
};

function hslHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A shirt colour for a nation: a known one, or one drawn from its code so it stays the same every time. */
export function nationKit(code: string): string {
  if (NATION_KIT[code]) return NATION_KIT[code];
  const h = [...code].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 360, 7);
  return hslHex(h, 0.62, 0.46);
}
