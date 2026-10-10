export type HairStyle = 'bald' | 'buzz' | 'short' | 'quiff' | 'afro' | 'curls' | 'long' | 'braids' | 'bob' | 'ponytail' | 'bun' | 'pixie';
export type BeardStyle = 'none' | 'stubble' | 'short' | 'full';
export type FaceShape = 'oval' | 'round' | 'square';
export type Gender = 'male' | 'female';
export type Hat = 'none' | 'cap' | 'beanie' | 'headband';
export type Glasses = 'none' | 'round' | 'square' | 'sun';
export type EarGear = 'none' | 'stud' | 'hoop' | 'earbuds' | 'headphones';
export type Piercing = 'none' | 'nose' | 'brow' | 'lip';

export interface Look {
  /** Index into SKINS */
  skin: number;
  hair: HairStyle;
  /** Index into HAIR_COLORS */
  hairColor: number;
  beard: BeardStyle;
  /** Index into EYE_COLORS (older saves: brown) */
  eyes?: number;
  face?: FaceShape;
  gender?: Gender;
  // accessories
  hat?: Hat;
  glasses?: Glasses;
  ears?: EarGear;
  piercing?: Piercing;
  chain?: boolean;
  /** Index into ACC_COLORS: cap, frames, headphones */
  accColor?: number;
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

export const EYE_COLORS = [
  { id: 'dark brown', hex: '#3a2216' },
  { id: 'brown', hex: '#6b4423' },
  { id: 'hazel', hex: '#8a6a2e' },
  { id: 'green', hex: '#4f7a4a' },
  { id: 'blue', hex: '#4a7fb5' },
  { id: 'grey', hex: '#7b8794' },
] as const;

export const FACE_SHAPES: FaceShape[] = ['oval', 'round', 'square'];
export const FACE_LABEL: Record<FaceShape, string> = { oval: 'Oval', round: 'Round', square: 'Square' };

export const ACC_COLORS = [
  { id: 'black', hex: '#1c1c20' },
  { id: 'white', hex: '#f4f4f5' },
  { id: 'navy', hex: '#1e3a8a' },
  { id: 'red', hex: '#dc2626' },
  { id: 'emerald', hex: '#059669' },
  { id: 'gold', hex: '#d9a42b' },
] as const;

export const HAT_STYLES: Hat[] = ['none', 'cap', 'beanie', 'headband'];
export const GLASSES_STYLES: Glasses[] = ['none', 'round', 'square', 'sun'];
export const EAR_STYLES: EarGear[] = ['none', 'stud', 'hoop', 'earbuds', 'headphones'];
export const PIERCINGS: Piercing[] = ['none', 'nose', 'brow', 'lip'];

export const HAT_LABEL: Record<Hat, string> = { none: 'No hat', cap: 'Cap', beanie: 'Beanie', headband: 'Headband' };
export const GLASSES_LABEL: Record<Glasses, string> = { none: 'No glasses', round: 'Round', square: 'Square', sun: 'Sunglasses' };
export const EAR_LABEL: Record<EarGear, string> = { none: 'Nothing', stud: 'Stud', hoop: 'Hoop', earbuds: 'Earbuds', headphones: 'Headphones' };
export const PIERCING_LABEL: Record<Piercing, string> = { none: 'None', nose: 'Nose', brow: 'Eyebrow', lip: 'Lip' };

export const HAIR_STYLES: HairStyle[] = ['bald', 'buzz', 'short', 'quiff', 'afro', 'curls', 'long', 'braids', 'bob', 'ponytail', 'bun', 'pixie'];
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
  bob: 'Bob',
  ponytail: 'Ponytail',
  bun: 'Bun',
  pixie: 'Pixie cut',
};

export const BEARD_LABEL: Record<BeardStyle, string> = {
  none: 'Clean',
  stubble: 'Stubble',
  short: 'Short beard',
  full: 'Full beard',
};

export const DEFAULT_LOOK: Look = { skin: 2, hair: 'short', hairColor: 0, beard: 'none', eyes: 1, face: 'oval', gender: 'male', hat: 'none', glasses: 'none', ears: 'none', piercing: 'none', chain: false, accColor: 0 };

export const lookOf = (p: { look?: Look } | null | undefined): Look => p?.look ?? DEFAULT_LOOK;

/** A random head. Pass a seeded `rng` to get the same teammates every time. */
export const randomLook = (rng: () => number = Math.random): Look => {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rng() * a.length)];
  const female = rng() < 0.4;
  return {
    skin: Math.floor(rng() * SKINS.length),
    hair: pick(female ? (['long', 'bob', 'ponytail', 'bun', 'pixie', 'curls', 'braids', 'afro', 'short'] as HairStyle[]) : (['buzz', 'short', 'quiff', 'afro', 'curls', 'braids', 'bald', 'long'] as HairStyle[])),
    hairColor: Math.floor(rng() * 6),
    beard: female ? 'none' : pick(BEARD_STYLES),
    eyes: Math.floor(rng() * EYE_COLORS.length),
    face: pick(FACE_SHAPES),
    gender: female ? 'female' : 'male',
    hat: rng() < 0.15 ? pick(['cap', 'beanie', 'headband'] as Hat[]) : 'none',
    glasses: rng() < 0.2 ? pick(['round', 'square', 'sun'] as Glasses[]) : 'none',
    ears: rng() < 0.25 ? pick(['stud', 'hoop', 'earbuds', 'headphones'] as EarGear[]) : 'none',
    piercing: rng() < 0.12 ? pick(['nose', 'brow', 'lip'] as Piercing[]) : 'none',
    chain: rng() < 0.15,
    accColor: Math.floor(rng() * ACC_COLORS.length),
  };
};
