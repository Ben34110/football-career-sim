/**
 * The app never shows system emoji: text is cleaned of them, and every symbol is drawn with an open-source icon (Lucide).
 * Flags are kept as data (they are drawn as real flag artwork by the Flag component).
 */
const KEEP = new Set(['★', '♂', '♀', '◀', '▶']);
// a flag drawn with tag letters (England, Scotland, Wales) is kept; any other pictograph (with its variation selector / joiners) goes
const CLUSTER = /(\u{1F3F4}[\u{E0020}-\u{E007F}]+)|(?:\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)⃣?[ ]?/gu;

export function stripEmoji(text: string): string {
  let changed = false;
  const out = text.replace(CLUSTER, (m, flag?: string) => {
    if (flag) return flag;
    if (KEEP.has(m.trim())) return m;
    changed = true;
    return '';
  });
  return changed ? out.replace(/[ ]{2,}/g, ' ').replace(/^\s+|\s+$/g, '') : text;
}
