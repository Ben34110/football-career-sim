import { getClub } from '../data/clubs';
import { nationalityByName } from '../data/nationalities';
import type { SeasonRecord } from '../types';

export interface HonourGroup {
  /** Same title in the same country */
  key: string;
  /** The title without its season ("League Title") */
  title: string;
  /** The country's flag: only for titles won in one country (the league, the national cup) */
  flag?: string;
  count: number;
  /** The trophies as stored ("League Title 2026/27"), oldest first */
  labels: string[];
}

/** "League Title 2026/27" → "League Title"; "Africa Cup of Nations 2029" → "Africa Cup of Nations" */
export const honourTitle = (trophy: string) => trophy.replace(/\s+\d{4}(\/\d{2})?$/, '');

/** Only the titles that belong to one country carry its flag: not the Champions League, the World Cup, the Olympics… */
const NATIONAL = /^(League Title|Domestic Cup)$/;

/** How prestigious each kind of title is, for the order of the cabinet. */
const ORDER: RegExp[] = [/^Ballon/, /World Cup$/, /^Champions League/, /^Olympic/, /^Europa League/, /Championship|Cup of Nations|Copa|Asian Cup|Gold Cup|Nations League/, /^League Title/, /^Domestic Cup/];
const rank = (title: string) => {
  const i = ORDER.findIndex((re) => re.test(title));
  return i === -1 ? ORDER.length : i;
};

/**
 * Groups the cabinet: the same title won twice is one line with a count ("×2"), and a league or a national cup
 * carries the flag of the country where it was won (the country of the club you played for that season).
 */
export function groupHonours(trophies: string[], history: SeasonRecord[], currentClubId: string | null): HonourGroup[] {
  const groups = new Map<string, HonourGroup>();
  for (const tr of trophies) {
    const title = honourTitle(tr);
    let flag: string | undefined;
    if (NATIONAL.test(title)) {
      const rec = history.find((r) => r.trophies.includes(tr));
      const country = getClub(rec?.clubId ?? currentClubId)?.country;
      flag = country ? nationalityByName(country)?.flag : undefined;
    }
    const key = `${title}|${flag ?? ''}`;
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      g.labels.push(tr);
    } else groups.set(key, { key, title, flag, count: 1, labels: [tr] });
  }
  return [...groups.values()].sort((a, b) => rank(a.title) - rank(b.title) || b.count - a.count);
}
