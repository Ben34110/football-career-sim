import type { Nationality } from '../types';
import { WORLD } from './world';

const REGION: Record<Nationality['confederation'], Nationality['region']> = {
  UEFA: 'Europe',
  CAF: 'Africa',
  CONMEBOL: 'Americas',
  CONCACAF: 'Americas',
  AFC: 'Asia',
};

export const REGIONS: Nationality['region'][] = ['Europe', 'Africa', 'Americas', 'Asia'];

export const NATIONALITIES: Nationality[] = WORLD.map((w) => ({
  code: w.code,
  name: w.name,
  flag: w.flag,
  confederation: w.confederation,
  // a tiny nation still fields a real team
  strength: Math.max(w.strength, 52),
  region: REGION[w.confederation],
}));

export const getNationality = (code: string): Nationality =>
  NATIONALITIES.find((n) => n.code === code) ?? NATIONALITIES[0];

export const nationalityByName = (name: string): Nationality | undefined => NATIONALITIES.find((n) => n.name === name);

/** Opponent pool for international fixtures */
export const OPPONENT_NATIONS = NATIONALITIES;

export const TOURNAMENT_BY_CONFED: Record<Nationality['confederation'], string> = {
  UEFA: 'European Championship',
  CAF: 'Africa Cup of Nations',
  CONMEBOL: 'Copa América',
  AFC: 'AFC Asian Cup',
  CONCACAF: 'Gold Cup',
};

/**
 * Which tournament (if any) a nation plays at the end of the season that
 * finishes in `endYear` (2026/27 → 2027).
 */
/** Youth competitions: the U20 World Cup every odd year, the Olympic football tournament every four years. */
export function youthTournamentFor(level: 'U23' | 'U20', endYear: number): string | null {
  if (level === 'U20') return endYear % 2 === 1 ? 'U20 World Cup' : null;
  return endYear % 4 === 0 ? 'Olympic Games' : null;
}

export function tournamentFor(endYear: number, nat: Nationality): string | null {
  if (endYear >= 2030 && (endYear - 2026) % 4 === 0) return 'FIFA World Cup';
  switch (nat.confederation) {
    case 'UEFA':
    case 'CONMEBOL':
      return endYear % 4 === 0 ? TOURNAMENT_BY_CONFED[nat.confederation] : null;
    case 'CAF':
    case 'CONCACAF':
      return endYear % 2 === 1 ? TOURNAMENT_BY_CONFED[nat.confederation] : null;
    case 'AFC':
      return endYear % 4 === 3 ? TOURNAMENT_BY_CONFED[nat.confederation] : null;
  }
}
