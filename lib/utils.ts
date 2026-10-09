export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const fmtCountdown = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Letters-only 3 char crest code ("🇫🇷 FRA" → "FRA") */
export const crestShort = (short: string) => short.replace(/[^\p{L}\p{N}]/gu, '').slice(-3) || short.slice(0, 3);
