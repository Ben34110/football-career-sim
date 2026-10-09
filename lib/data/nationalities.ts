import type { Nationality } from '../types';

export const NATIONALITIES: Nationality[] = [
  { code: 'FRA', name: 'France', flag: '🇫🇷', confederation: 'UEFA', strength: 86 },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', confederation: 'CAF', strength: 79 },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸', confederation: 'UEFA', strength: 86 },
  { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA', strength: 85 },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷', confederation: 'CONMEBOL', strength: 85 },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', confederation: 'CONMEBOL', strength: 86 },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', confederation: 'UEFA', strength: 84 },
  { code: 'GER', name: 'Germany', flag: '🇩🇪', confederation: 'UEFA', strength: 83 },
  { code: 'NED', name: 'Netherlands', flag: '🇳🇱', confederation: 'UEFA', strength: 82 },
  { code: 'NGA', name: 'Nigeria', flag: '🇳🇬', confederation: 'CAF', strength: 77 },
  { code: 'MAR', name: 'Morocco', flag: '🇲🇦', confederation: 'CAF', strength: 80 },
  { code: 'CIV', name: 'Ivory Coast', flag: '🇨🇮', confederation: 'CAF', strength: 77 },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵', confederation: 'AFC', strength: 78 },
  { code: 'USA', name: 'United States', flag: '🇺🇸', confederation: 'CONCACAF', strength: 76 },
];

export const getNationality = (code: string): Nationality =>
  NATIONALITIES.find((n) => n.code === code) ?? NATIONALITIES[0];

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
