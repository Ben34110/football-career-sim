import type { Fixture } from './types';
import type { Lang } from './i18n/lang';

const DAY = 86_400_000;

/** In-game kick-off date of fixture `idx` (league/cup spread over the season, tournaments in June). */
export function fixtureDate(season: { year: number; fixtures: Fixture[] }, idx: number): Date {
  const f = season.fixtures[idx];
  if (f?.kind === 'tournament') {
    const n = season.fixtures.slice(0, idx).filter((x) => x.kind === 'tournament').length;
    return new Date(Date.UTC(season.year + 1, 5, 10) + n * 5 * DAY);
  }
  const p = season.fixtures.slice(0, idx).filter((x) => x.kind !== 'tournament').length;
  return new Date(Date.UTC(season.year, 7, 8) + p * 20 * DAY);
}

const locale = (lang: Lang) => (lang === 'fr' ? 'fr-FR' : 'en-GB');

export const fmtShortDate = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);

/** Real-world "today", e.g. "jeudi 9 octobre 2026" */
export const fmtToday = (lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
