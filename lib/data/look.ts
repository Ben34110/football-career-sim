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

/** How skin tones are spread in a country's squad: weights for the six tones of SKINS, lightest first. */
const P = {
  light: [0.38, 0.4, 0.18, 0.04, 0, 0],
  euroMixed: [0.26, 0.3, 0.18, 0.1, 0.09, 0.07],
  euroDiverse: [0.22, 0.25, 0.16, 0.1, 0.14, 0.13],
  olive: [0.12, 0.35, 0.35, 0.15, 0.03, 0],
  oliveLight: [0.25, 0.4, 0.28, 0.07, 0, 0],
  maghreb: [0.02, 0.18, 0.4, 0.28, 0.1, 0.02],
  horn: [0, 0, 0.1, 0.35, 0.4, 0.15],
  black: [0, 0, 0.02, 0.12, 0.44, 0.42],
  southAfrica: [0.02, 0.03, 0.08, 0.2, 0.35, 0.32],
  mestizo: [0.05, 0.25, 0.4, 0.25, 0.05, 0],
  brazil: [0.15, 0.2, 0.2, 0.2, 0.15, 0.1],
  northAmerica: [0.28, 0.22, 0.16, 0.1, 0.14, 0.1],
  caribbean: [0, 0, 0.02, 0.15, 0.45, 0.38],
  eastAsia: [0.3, 0.5, 0.2, 0, 0, 0],
  southAsia: [0, 0.05, 0.35, 0.45, 0.15, 0],
  middleEast: [0.05, 0.3, 0.4, 0.2, 0.05, 0],
  oceania: [0.4, 0.3, 0.15, 0.08, 0.04, 0.03],
  anywhere: [0.15, 0.2, 0.25, 0.2, 0.12, 0.08],
} as const;
type Spread = readonly number[];

const SKIN_BY_CODE: Record<string, Spread> = {
  FRA: P.euroDiverse, ENG: P.euroDiverse,
  NED: P.euroMixed, BEL: P.euroMixed, POR: P.euroMixed, GER: P.euroMixed, SWE: P.euroMixed, DEN: P.euroMixed, SUI: P.euroMixed, WAL: P.euroMixed, AUT: P.euroMixed,
  ESP: P.oliveLight, ITA: P.oliveLight, CRO: P.oliveLight,
  GRE: P.olive, TUR: P.olive, ALB: P.olive, ISR: P.olive, CYP: P.olive, MLT: P.olive, KOS: P.olive, MKD: P.olive, GEO: P.olive, ARM: P.olive, AZE: P.olive,
  ARG: P.light, URU: P.light, CHI: P.light,
  BRA: P.brazil, COL: P.mestizo, ECU: P.mestizo, PAR: P.mestizo, PER: P.mestizo, VEN: P.mestizo, BOL: P.mestizo,
  USA: P.northAmerica, CAN: P.northAmerica, MEX: P.mestizo, CRC: P.mestizo, PAN: P.mestizo, HON: P.mestizo, JAM: P.caribbean,
  MAR: P.maghreb, ALG: P.maghreb, TUN: P.maghreb, EGY: P.maghreb, LBY: P.maghreb,
  ETH: P.horn, ERI: P.horn, SOM: P.horn, DJI: P.horn, SDN: P.horn, SSD: P.horn,
  RSA: P.southAfrica,
  JPN: P.eastAsia, KOR: P.eastAsia, CHN: P.eastAsia,
  IND: P.southAsia, THA: P.southAsia, VIE: P.southAsia, IDN: P.southAsia,
  IRN: P.middleEast, KSA: P.middleEast, QAT: P.middleEast, UAE: P.middleEast, IRQ: P.middleEast, UZB: P.middleEast, JOR: P.middleEast,
  AUS: P.oceania,
};
/** Sub-Saharan Africa is the rest of CAF; the rest of Europe is light. */
const AFRICA = new Set('SEN NGA CIV GHA CMR MLI BFA COD CGO GAB GUI GNB CPV ZAM UGA ANG BEN MOZ KEN TAN ZIM TOG NIG MTN GAM SLE LBR CHA CTA EQG COM MAD MRI SEY BDI RWA MWI NAM BOT LES SWZ STP'.split(' '));

/** The skin tones of a country's players: a Senegal squad is almost all dark-skinned with a few mixed-race players, Argentina's almost all light. */
export const skinSpreadFor = (code?: string): Spread => (code ? SKIN_BY_CODE[code] ?? (AFRICA.has(code) ? P.black : P.light) : P.anywhere);

/** A random head. Pass a seeded `rng` to get the same teammates every time, and a nation to get the faces of that country. */
export const randomLook = (rng: () => number = Math.random, nation?: string): Look => {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rng() * a.length)];
  const female = rng() < 0.4;
  const spread = skinSpreadFor(nation);
  let r = rng();
  let skin = spread.length - 1;
  for (let i = 0; i < spread.length; i++) {
    if (r < spread[i]) {
      skin = i;
      break;
    }
    r -= spread[i];
  }
  const dark = skin >= 4;
  const asian = spread === P.eastAsia;
  const hairs: HairStyle[] = dark
    ? female
      ? ['braids', 'afro', 'curls', 'bun', 'short', 'bob']
      : ['buzz', 'short', 'afro', 'curls', 'braids', 'bald']
    : female
      ? ['long', 'bob', 'ponytail', 'bun', 'pixie', 'curls', 'braids', 'short']
      : ['buzz', 'short', 'quiff', 'curls', 'bald', 'long'];
  // hair colour follows the skin: dark heads have dark hair, blond only on the lightest
  const hairColor = dark || asian ? (rng() < 0.9 ? 0 : 1) : skin >= 3 ? pick([0, 0, 1]) : skin === 2 ? pick([0, 1, 2, 0, 1]) : Math.floor(rng() * 6);
  return {
    skin,
    hair: pick(hairs),
    hairColor,
    beard: female ? 'none' : pick(BEARD_STYLES),
    eyes: dark || asian ? pick([0, 0, 1]) : Math.floor(rng() * EYE_COLORS.length),
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
