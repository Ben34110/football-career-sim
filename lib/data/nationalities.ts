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

/* ───────── A national side gets a little stronger with its titles ───────── */

const BASE_STRENGTH = new Map(NATIONALITIES.map((n) => [n.code, n.strength]));
/** What a nation has gained (or lost) from its results on top of its normal level (kept per career) */
let nationBoosts: Record<string, number> = {};
export const MAX_NATION_BOOST = 6;
export const getNationBoost = (code: string) => nationBoosts[code] ?? 0;

/** Gives every nation its level again: its own, plus what the titles of this career have added. */
export function setNationBoosts(next: Record<string, number>) {
  nationBoosts = next;
  for (const n of NATIONALITIES) {
    const base = BASE_STRENGTH.get(n.code) ?? n.strength;
    n.strength = Math.max(45, Math.min(96, base + Math.max(-MAX_NATION_BOOST, Math.min(MAX_NATION_BOOST, nationBoosts[n.code] ?? 0))));
  }
}

/**
 * What a title adds to the national side: +2 for the World Nations Cup, +1 for the Summer Games and for a continental
 * championship. Youth tournaments and the Nations Trophy add nothing.
 */
export function nationTitleBonus(trophy: string): number {
  if (/^U\d\d /.test(trophy)) return 0;
  if (/^World Nations Cup \d{4}$/.test(trophy)) return 2;
  if (/^(Summer Games|European Championship|African Nations Cup|South American Cup|Asian Nations Cup|North American Cup) \d{4}$/.test(trophy)) return 1;
  return 0;
}

export const getNationality = (code: string): Nationality =>
  NATIONALITIES.find((n) => n.code === code) ?? NATIONALITIES[0];

export const nationalityByName = (name: string): Nationality | undefined => NATIONALITIES.find((n) => n.name === name);

/** Opponent pool for international fixtures */
export const OPPONENT_NATIONS = NATIONALITIES;

export const TOURNAMENT_BY_CONFED: Record<Nationality['confederation'], string> = {
  UEFA: 'European Championship',
  CAF: 'African Nations Cup',
  CONMEBOL: 'South American Cup',
  AFC: 'Asian Nations Cup',
  CONCACAF: 'North American Cup',
};

/**
 * Which tournament (if any) a nation plays at the end of the season that
 * finishes in `endYear` (2026/27 → 2027).
 */
const YOUTH_CONTINENTAL: Record<'U23' | 'U20', Record<Nationality['confederation'], string>> = {
  U20: {
    UEFA: 'U20 European Championship',
    CAF: 'U20 African Nations Cup',
    CONMEBOL: 'U20 South American Cup',
    AFC: 'U20 Asian Nations Cup',
    CONCACAF: 'U20 North American Cup',
  },
  U23: {
    UEFA: 'U23 European Championship',
    CAF: 'U23 African Nations Cup',
    CONMEBOL: 'U23 South American Cup',
    AFC: 'U23 Asian Nations Cup',
    CONCACAF: 'U23 North American Cup',
  },
};

/**
 * Youth competitions.
 *  U20: World Nations Cup in odd years, the continental championship (Euro, CAN, Copa…) in even years.
 *  U23: Summer Games every 4 years, the U23 World Nations Cup two years later, the continental championship in odd years.
 */
export function youthTournamentFor(level: 'U23' | 'U20', endYear: number, nat: Nationality): string | null {
  if (level === 'U20') return endYear % 2 === 1 ? 'U20 World Nations Cup' : YOUTH_CONTINENTAL.U20[nat.confederation];
  if (endYear % 4 === 0) return 'Summer Games';
  if (endYear % 4 === 2) return 'U23 World Nations Cup';
  return YOUTH_CONTINENTAL.U23[nat.confederation];
}

export function tournamentFor(endYear: number, nat: Nationality): string | null {
  if (endYear >= 2030 && (endYear - 2026) % 4 === 0) return 'World Nations Cup';
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

/** Played by every European nation in the years without a Euro or a World Nations Cup, so there is a competition every summer. */
export const NATIONS_LEAGUE = 'European Nations Trophy';

/**
 * The tournament a player of this level plays at the end of the season finishing in `endYear`, if any.
 *  - youth sides: their own competitions;
 *  - the senior side: the continental championship / World Nations Cup, else the Nations Trophy (Europe, odd years);
 *  - the Summer Games (every 4 years) are open to every player who is young, or a star old enough to be one of the three overage players,
 *    whenever there is no senior tournament that summer.
 */
export function nationalTournament(level: 'A' | 'U23' | 'U20', endYear: number, nat: Nationality, age = 18, ovr = 0): string | null {
  if (level !== 'A') return youthTournamentFor(level, endYear, nat);
  const senior = tournamentFor(endYear, nat);
  if (senior) return senior;
  if (nat.confederation === 'UEFA' && endYear % 2 === 1) return NATIONS_LEAGUE;
  if (endYear % 4 === 0 && (age <= 23 || ovr >= nat.strength - 3)) return 'Summer Games';
  return null;
}
