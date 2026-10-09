export type HairStyle = 'bald' | 'buzz' | 'short' | 'quiff' | 'afro' | 'curls' | 'long' | 'braids';
export type BeardStyle = 'none' | 'stubble' | 'short' | 'full';

export interface Look {
  /** Index into SKINS */
  skin: number;
  hair: HairStyle;
  /** Index into HAIR_COLORS */
  hairColor: number;
  beard: BeardStyle;
}

export const SKINS = ['#f7d9c0', '#efc29b', '#d9a577', '#b57d52', '#8a5a3b', '#5c3b28'] as const;

export const HAIR_COLORS = [
  { id: 'black', hex: '#17120f' },
  { id: 'brown', hex: '#4a2f1d' },
  { id: 'chestnut', hex: '#7a4a27' },
  { id: 'blond', hex: '#d8b45c' },
  { id: 'ginger', hex: '#b4502a' },
  { id: 'grey', hex: '#9ca3af' },
  { id: 'platinum', hex: '#eceae4' },
  { id: 'emerald', hex: '#10b981' },
] as const;

export const HAIR_STYLES: HairStyle[] = ['bald', 'buzz', 'short', 'quiff', 'afro', 'curls', 'long', 'braids'];
export const BEARD_STYLES: BeardStyle[] = ['none', 'stubble', 'short', 'full'];

export const HAIR_LABEL: Record<HairStyle, string> = {
  bald: 'Bald',
  buzz: 'Buzz cut',
  short: 'Short',
  quiff: 'Quiff',
  afro: 'Afro',
  curls: 'Curls',
  long: 'Long',
  braids: 'Braids',
};

export const BEARD_LABEL: Record<BeardStyle, string> = {
  none: 'Clean',
  stubble: 'Stubble',
  short: 'Short beard',
  full: 'Full beard',
};

export const DEFAULT_LOOK: Look = { skin: 2, hair: 'short', hairColor: 0, beard: 'none' };

export const lookOf = (p: { look?: Look } | null | undefined): Look => p?.look ?? DEFAULT_LOOK;

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export const randomLook = (): Look => ({
  skin: Math.floor(Math.random() * SKINS.length),
  hair: pick(HAIR_STYLES),
  hairColor: Math.floor(Math.random() * 6),
  beard: pick(BEARD_STYLES),
});
