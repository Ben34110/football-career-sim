import type { Confederation, Club, EuroComp } from '../types';
import { WORLD } from './world';

/**
 * Every continent has its own pair of club competitions: an Elite Cup for the best clubs and a Challenge Cup below it.
 * Where a club plays depends on the country it is in.
 */
export const REGION: Record<Confederation, string> = {
  UEFA: 'Europe',
  CAF: 'Africa',
  CONMEBOL: 'South America',
  AFC: 'Asia',
  CONCACAF: 'North America',
};

const COMPS: Record<Confederation, { elite: EuroComp; challenge: EuroComp }> = {
  UEFA: { elite: 'Europe Elite Cup', challenge: 'Europe Challenge Cup' },
  CAF: { elite: 'Africa Elite Cup', challenge: 'Africa Challenge Cup' },
  CONMEBOL: { elite: 'South America Elite Cup', challenge: 'South America Challenge Cup' },
  AFC: { elite: 'Asia Elite Cup', challenge: 'Asia Challenge Cup' },
  CONCACAF: { elite: 'North America Elite Cup', challenge: 'North America Challenge Cup' },
};

const BY_NAME = new Map(WORLD.map((w) => [w.name, w.confederation]));

/** The confederation of a country (by its English name). */
export const continentOf = (country: string | null | undefined): Confederation => (country ? BY_NAME.get(country) ?? 'UEFA' : 'UEFA');

export const eliteCup = (conf: Confederation): EuroComp => COMPS[conf].elite;
export const challengeCup = (conf: Confederation): EuroComp => COMPS[conf].challenge;

/** "Europe Elite Cup 2027/28", "Asia Challenge Cup Group Match 2"… */
export const CONTINENTAL_RE = /^(?:Europe|Africa|South America|Asia|North America) (?:Elite|Challenge) Cup/;
export const isElite = (comp: string) => /Elite Cup/.test(comp);
/** The continent of a competition: "Asia Elite Cup" → "Asia" */
export const regionOfComp = (comp: string) => comp.replace(/ (Elite|Challenge) Cup.*$/, '');

/** The same level of competition, in the continent of this club (a player who moves abroad plays in his new continent). */
export const localComp = (comp: EuroComp, club: Club): EuroComp => {
  const conf = continentOf(club.country);
  return isElite(comp) ? eliteCup(conf) : challengeCup(conf);
};

/** The club world championship: the Elite Cup winners of the continents, one semi-final and a final. */
export const WORLD_CLUB_CUP = 'World Club Cup';
export const isWorldClubLabel = (label: string) => label.startsWith(WORLD_CLUB_CUP);
/** Did this season's trophies include a continental Elite Cup? */
export const wonEliteCup = (trophies: string[]) => trophies.some((t) => CONTINENTAL_RE.test(t) && isElite(t));
