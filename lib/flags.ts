/**
 * Flags are real artwork (public/flags, from the MIT-licensed flag-icons set), not the phone's emoji.
 * Data still stores flags as emoji; this maps them to the matching file.
 */
export function flagCode(emoji: string | null | undefined): string | null {
  if (!emoji) return null;
  const cps = [...emoji.trim()].map((c) => c.codePointAt(0) ?? 0);
  // two regional indicators: 🇸🇳 → "sn"
  if (cps.length >= 2 && cps[0] >= 0x1f1e6 && cps[0] <= 0x1f1ff && cps[1] >= 0x1f1e6 && cps[1] <= 0x1f1ff) {
    return String.fromCharCode(cps[0] - 0x1f1e6 + 97, cps[1] - 0x1f1e6 + 97);
  }
  // black flag + tag letters: England 🏴󠁧󠁢󠁥󠁮󠁧󠁿 → "gb-eng"
  if (cps[0] === 0x1f3f4) {
    const tag = cps
      .slice(1)
      .filter((c) => c >= 0xe0061 && c <= 0xe007a)
      .map((c) => String.fromCharCode(c - 0xe0000))
      .join('');
    return tag.length >= 5 ? `${tag.slice(0, 2)}-${tag.slice(2)}` : null;
  }
  return null;
}

export const flagUrl = (emoji: string | null | undefined): string | null => {
  const code = flagCode(emoji);
  return code ? `/flags/${code}.svg` : null;
};
