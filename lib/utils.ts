export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const fmtCountdown = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Letters-only 3 char crest code ("🇫🇷 FRA" → "FRA") */
/** A national flag at the start of a short label ("🇸🇳 SEN"), if any */
const FLAG = /^(\p{Regional_Indicator}{2}|\u{1F3F4}[\u{E0020}-\u{E007F}]+)/u;

/** The flag of a national side's short label, or '' for a club */
export const flagOnly = (short: string) => FLAG.exec(short.trim())?.[0] ?? '';

/** What goes inside a crest: the country flag for national sides, the club initials otherwise */
export const crestFace = (short: string) => FLAG.exec(short.trim())?.[0] ?? crestShort(short);

export const crestShort = (short: string) => short.replace(/[^\p{L}\p{N}]/gu, '').slice(-3) || short.slice(0, 3);

const CLUB_WORDS: [RegExp, string][] = [
  [/\bOlympique\b/i, 'Oly.'],
  [/\bAthletic\b/i, 'Ath.'],
  [/\bSporting\b/i, 'Spo.'],
  [/\bInternazionale\b/i, 'Inter'],
  [/\bUnited\b/i, 'Utd'],
  [/\bRacing\b/i, 'Rac.'],
  [/\bAtl[eé]tico\b/i, 'Atl.'],
  [/\bBorussia\b/i, 'Bor.'],
  [/\bFootball Club\b/i, 'FC'],
];

/** A club name that fits a small card: long names are shortened ("Olympique du Rhône" → "Oly. Rhône"). */
export function abbrevClub(name: string, max = 13): string {
  if (name.length <= max) return name;
  let n = name;
  for (const [re, to] of CLUB_WORDS) n = n.replace(re, to);
  n = n.replace(/\s+(du|de|des|de la|di|del|da|do|von|van)\s+/i, ' ');
  return n.trim();
}
