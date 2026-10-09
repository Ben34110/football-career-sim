import type { Club } from '../types';
import { STYLES, WORLD, type WorldCountry } from './world';

/**
 * tier 1 = global elite … tier 5 = lower leagues.
 * `strength` is on the same scale as a player's OVR.
 */
const CURATED_CLUBS: Club[] = [
  /* ── Starter clubs ── */
  { id: 'fc-lyonnais-b', name: 'Stade Lavallois', short: 'LAV', league: 'National 1', country: 'France', flag: '🇫🇷', tier: 5, strength: 58, budget: 1, color: '#f97316', starter: true },
  { id: 'us-orleans', name: 'US Orléans', short: 'ORL', league: 'National 1', country: 'France', flag: '🇫🇷', tier: 5, strength: 56, budget: 0.8, color: '#ef4444', starter: true },
  { id: 'fc-versailles', name: 'FC Versailles', short: 'VER', league: 'National 1', country: 'France', flag: '🇫🇷', tier: 5, strength: 60, budget: 1.4, color: '#3b82f6', starter: true },
  { id: 'tranmere', name: 'Tranmere Town', short: 'TRA', league: 'English League Two', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 5, strength: 59, budget: 1.2, color: '#e5e7eb', starter: true },
  { id: 'grimsby', name: 'Grimsby Mariners', short: 'GRI', league: 'English League Two', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 5, strength: 57, budget: 0.9, color: '#a3a3a3', starter: true },
  { id: 'crawley', name: 'Crawley Rovers', short: 'CRA', league: 'English League Two', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 5, strength: 56, budget: 0.8, color: '#dc2626', starter: true },
  { id: 'real-murcia', name: 'Real Murcia B', short: 'MUR', league: 'Segunda RFEF', country: 'Spain', flag: '🇪🇸', tier: 5, strength: 57, budget: 0.7, color: '#be123c', starter: true },
  { id: 'ud-logrones', name: 'UD Logroñés', short: 'LOG', league: 'Segunda RFEF', country: 'Spain', flag: '🇪🇸', tier: 5, strength: 55, budget: 0.6, color: '#16a34a', starter: true },
  { id: 'americano-fc', name: 'Americano FC', short: 'AME', league: 'Série B', country: 'Brazil', flag: '🇧🇷', tier: 4, strength: 63, budget: 2, color: '#facc15', starter: true },
  { id: 'vila-nova', name: 'Vila Nova', short: 'VIL', league: 'Série B', country: 'Brazil', flag: '🇧🇷', tier: 4, strength: 62, budget: 1.8, color: '#ef4444', starter: true },
  { id: 'us-goree', name: 'US Gorée', short: 'GOR', league: 'Ligue 1 Sénégal', country: 'Senegal', flag: '🇸🇳', tier: 5, strength: 55, budget: 0.5, color: '#22c55e', starter: true },
  { id: 'generation-foot', name: 'Génération Foot', short: 'GEN', league: 'Ligue 1 Sénégal', country: 'Senegal', flag: '🇸🇳', tier: 5, strength: 60, budget: 1.1, color: '#f59e0b', starter: true },

  /* ── Tier 4 – second divisions ── */
  { id: 'sc-bastia', name: 'SC Bastia', short: 'BAS', league: 'Ligue 2', country: 'France', flag: '🇫🇷', tier: 4, strength: 66, budget: 5, color: '#2563eb' },
  { id: 'leeds-utd', name: 'Leeds Albion', short: 'LEE', league: 'Championship', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 4, strength: 70, budget: 12, color: '#fafafa' },
  { id: 'real-oviedo', name: 'Real Oviedo', short: 'OVI', league: 'La Liga 2', country: 'Spain', flag: '🇪🇸', tier: 4, strength: 67, budget: 6, color: '#2563eb' },
  { id: 'fortuna-koln', name: 'Fortuna Köln', short: 'KOL', league: '2. Bundesliga', country: 'Germany', flag: '🇩🇪', tier: 4, strength: 68, budget: 8, color: '#dc2626' },

  /* ── Tier 3 – solid top flights ── */
  { id: 'stade-reims', name: 'Stade de Reims', short: 'REI', league: 'Ligue 1', country: 'France', flag: '🇫🇷', tier: 3, strength: 72, budget: 20, color: '#dc2626' },
  { id: 'brighton-hv', name: 'Brighton Harbour', short: 'BRH', league: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 3, strength: 76, budget: 45, color: '#38bdf8' },
  { id: 'real-sociedad-x', name: 'Real Bahía', short: 'RBA', league: 'La Liga', country: 'Spain', flag: '🇪🇸', tier: 3, strength: 76, budget: 40, color: '#3b82f6' },
  { id: 'sporting-cl', name: 'Sporting Lusitano', short: 'SPL', league: 'Liga Portugal', country: 'Portugal', flag: '🇵🇹', tier: 3, strength: 75, budget: 35, color: '#16a34a' },
  { id: 'flamengo-x', name: 'CR Carioca', short: 'CAR', league: 'Brasileirão', country: 'Brazil', flag: '🇧🇷', tier: 3, strength: 74, budget: 30, color: '#ef4444' },

  /* ── Tier 2 – continental contenders ── */
  { id: 'ol-rhone', name: 'Olympique du Rhône', short: 'OLR', league: 'Ligue 1', country: 'France', flag: '🇫🇷', tier: 2, strength: 80, budget: 90, color: '#1d4ed8' },
  { id: 'dortmund-x', name: 'Borussia Rhein', short: 'BRR', league: 'Bundesliga', country: 'Germany', flag: '🇩🇪', tier: 2, strength: 82, budget: 110, color: '#facc15' },
  { id: 'napoli-x', name: 'Napoli Azzurri', short: 'NAP', league: 'Serie A', country: 'Italy', flag: '🇮🇹', tier: 2, strength: 81, budget: 100, color: '#38bdf8' },
  { id: 'villa-x', name: 'Aston Vale', short: 'AVL', league: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 2, strength: 82, budget: 130, color: '#7c3aed' },

  /* ── Tier 1 – global elite ── */
  { id: 'psg-x', name: 'Paris Étoile FC', short: 'PEF', league: 'Ligue 1', country: 'France', flag: '🇫🇷', tier: 1, strength: 88, budget: 300, color: '#1e3a8a' },
  { id: 'madrid-x', name: 'Real Capital CF', short: 'RCC', league: 'La Liga', country: 'Spain', flag: '🇪🇸', tier: 1, strength: 90, budget: 350, color: '#f5f5f5' },
  { id: 'city-x', name: 'Manchester Sky', short: 'MSK', league: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tier: 1, strength: 90, budget: 380, color: '#7dd3fc' },
  { id: 'bayern-x', name: 'Bayern Alpen', short: 'BAL', league: 'Bundesliga', country: 'Germany', flag: '🇩🇪', tier: 1, strength: 89, budget: 320, color: '#dc2626' },
];

/* ───────── Generated clubs for every other country ───────── */

const HAND_CRAFTED = new Set(['FRA', 'SEN', 'ESP', 'ENG', 'BRA']);
const PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f97316', '#e5e7eb', '#14b8a6', '#eab308', '#ec4899', '#84cc16'];

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return Math.abs(h);
};

const shortFrom = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter((w) => w.length > 2)
    .pop()!
    ?.slice(0, 3)
    .toUpperCase() || 'FC';

/** Unique invented club names for a country, from its towns and naming style. */
function clubNames(w: WorldCountry, count = 26): string[] {
  const patterns = STYLES[w.style] ?? STYLES.en;
  const offset = hash(w.code) % patterns.length;
  const names: string[] = [];
  for (let pass = 0; names.length < count && pass < 12; pass++) {
    for (let i = 0; i < w.towns.length && names.length < count; i++) {
      const name = patterns[(i + pass * 3 + offset) % patterns.length].replace('{c}', w.towns[i]);
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

const GENERATED_RIVALS: Record<string, string[]> = {};

function generate(w: WorldCountry & { flag: string }): Club[] {
  const names = clubNames(w);
  if (names.length < 8) return [];
  const id = w.code.toLowerCase();
  const rivals = names.slice(4, 4 + 16);
  GENERATED_RIVALS[`${w.name}|${w.lowLeague}`] = rivals;
  GENERATED_RIVALS[`${w.name}|${w.topLeague}`] = rivals;

  const topStrength = Math.max(58, Math.min(76, Math.round(w.strength - 14 + (hash(w.code) % 5))));
  const topTier = topStrength >= 72 ? 3 : 4;
  const top: Club = {
    id: `${id}-top`,
    name: names[0],
    short: shortFrom(names[0]),
    league: w.topLeague,
    country: w.name,
    flag: w.flag,
    tier: topTier,
    strength: topStrength,
    budget: topTier === 3 ? 14 + (hash(names[0]) % 18) : 2 + (hash(names[0]) % 6),
    color: PALETTE[hash(names[0]) % PALETTE.length],
  };
  const starters = names.slice(1, 4).map<Club>((name, i) => ({
    id: `${id}-${i + 1}`,
    name,
    short: shortFrom(name),
    league: w.lowLeague,
    country: w.name,
    flag: w.flag,
    tier: 5,
    strength: 54 + (hash(name) % 7),
    budget: Math.round((0.5 + (hash(name + 'b') % 10) / 10) * 10) / 10,
    color: PALETTE[hash(name) % PALETTE.length],
    starter: true,
  }));
  return [top, ...starters];
}

const GENERATED_CLUBS = WORLD.filter((w) => !HAND_CRAFTED.has(w.code)).flatMap(generate);

export const CLUBS: Club[] = [...CURATED_CLUBS, ...GENERATED_CLUBS];

const BY_ID = new Map(CLUBS.map((c) => [c.id, c]));

export const getClub = (id: string | null): Club | undefined => (id ? BY_ID.get(id) : undefined);

export const STARTER_CLUBS = CLUBS.filter((c) => c.starter);

export const startersFor = (country: string) => STARTER_CLUBS.filter((c) => c.country === country);

/** Fake sparring partners for a club's domestic league table */
export const LEAGUE_RIVALS: Record<number, string[]> = {
  5: ['Racing Nord', 'AS Cannes Sud', 'Sporting Vale', 'Athletic Haven', 'Union Port', 'FC Meridian', 'Dynamo Plains', 'Olympia Town', 'Real Harbour', 'City Rangers', 'Albion United'],
  4: ['FC Bordeaux Sud', 'Wanderers FC', 'Sporting Gijón B', 'AC Verona Nord', 'Hansa Kiel', 'Norwich Fields', 'Millwall Docks', 'Real Zaragoza', 'Fortuna Ost', 'Stoke Potters', 'Sheffield Steel'],
  3: ['Lille Métro', 'Nice Riviera', 'Villarreal Naranja', 'Betis Verde', 'Everton Bay', 'Wolves Gold', 'Braga Minho', 'Porto Douro', 'Fulham Thames', 'Palace Eagles', 'Southampton Saints'],
  2: ['Marseille Port', 'Atlético Norte', 'Inter Milano', 'Leverkusen Chem', 'Spurs North', 'Newcastle Magpies', 'Roma Giallo', 'Lazio Aquile', 'Ajax Amstel', 'Benfica Lisboa', 'Chelsea Blue'],
  1: ['Inter Milano', 'Juventus Torino', 'Arsenal Gunners', 'Liverpool Reds', 'Atlético Norte', 'Barça Blaugrana', 'Milan Rossoneri', 'Dortmund Yellow', 'Leverkusen Chem', 'Tottenham North', 'Napoli Azzurri'],
};

/**
 * Domestic opposition for the starter leagues, named after real towns of the country
 * so a Senegalese career is played against Thiès, Saint-Louis, Ziguinchor… (all club names invented).
 */
const CURATED_RIVALS: Record<string, string[]> = {
  'Ligue 1 Sénégal': [
    'Thiès Étoile FC', 'AS Saint-Louis', 'Kaolack Racing', 'Ziguinchor Casamance FC', 'Touba Espoir', 'Mbour Teranga FC',
    'Louga Sahel', 'Tambacounda Baobab', 'Diourbel Baol FC', 'Kolda Fouladou', 'Rufisque Océan FC', 'Fatick Sine FC',
    'Saly Atlantique', 'Matam Fleuve', 'Kédougou Sabadola', 'Joal Pirogue FC',
  ],
  'National 1': [
    'AS Rouen Seine', 'Dijon Bourgogne FC', 'Le Mans Sarthe', 'Nancy Lorraine', 'Brest Armor', 'Quimper Cornouaille',
    'Annecy Lac FC', 'Grenoble Alpes', 'Perpignan Catalan', 'Cherbourg Cotentin', 'Pau Pyrénées', 'Troyes Aube FC',
    'Épinal Vosges', 'Nîmes Garrigue', 'Amiens Picardie', 'Metz Moselle FC',
  ],
  'English League Two': [
    'Bradford Mills', 'Salford Docks', 'Walsall Leather', 'Colchester Roman', 'Gillingham Medway', 'Newport Severn',
    'Harrogate Spa', 'Carlisle Border', 'Doncaster Don', 'Stockport Hatters', 'Morecambe Bay', 'Accrington Brick',
    'Swindon Wiltshire', 'Barrow Furness', 'Mansfield Stags', 'Wrexham Dragons',
  ],
  'Segunda RFEF': [
    'CD Alcoyano Costa', 'Baleares Mar CF', 'Ferrol Rías', 'UD Ibiza Isla', 'CF Badalona Mar', 'Águilas Levante',
    'CD Calahorra Rioja', 'Real Avilés', 'Cartagena Naval', 'Lorca Alfonso', 'Yeclano Vino', 'Linares Minero',
    'Talavera Cerámica', 'Marbella Costa del Sol', 'Algeciras Estrecho', 'Gijón Cantábrico',
  ],
  'Série B': [
    'Goiás Cerrado', 'Ponte Preta Campinas', 'Paysandu Belém', 'Náutico Recife', 'Sampaio Corrêa', 'Ribeirão Preto FC',
    'Londrina Café', 'Brusque Vale', 'Ituano Itu', 'Operário Ponta Grossa', 'Mirassol Paulista', 'Vitória Salvador',
    'Avaí Floripa', 'Criciúma Carvão', 'Santos Litoral', 'Manaus Amazônia',
  ],
};

/** Rivals by league: curated leagues by name, generated ones by "country|league". */
export const LOCAL_RIVALS: Record<string, string[]> = { ...CURATED_RIVALS, ...GENERATED_RIVALS };
