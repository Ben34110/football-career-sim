import type { Look } from './data/look';

export type Position = 'ST' | 'CAM' | 'RW' | 'LW';
export type Foot = 'Left' | 'Right' | 'Both';

export type AttrKey = 'finishing' | 'composure' | 'vision' | 'stamina';
export type Attributes = Record<AttrKey, number>;

export type RepKey = 'coachTrust' | 'fanPopularity' | 'lockerRoom' | 'mediaHeat';
export type Reputation = Record<RepKey, number>;

export type Confederation = 'UEFA' | 'CAF' | 'CONMEBOL' | 'AFC' | 'CONCACAF';

export interface Nationality {
  code: string;
  name: string;
  flag: string;
  confederation: Confederation;
  region: 'Europe' | 'Africa' | 'Americas' | 'Asia';
  /** National team strength (comparable to club strength) */
  strength: number;
}

export type ClubTier = 1 | 2 | 3 | 4 | 5;

export interface Club {
  id: string;
  name: string;
  short: string;
  league: string;
  country: string;
  flag: string;
  tier: ClubTier;
  /** Average first-team strength, same scale as player OVR */
  strength: number;
  /** Transfer budget in €M */
  budget: number;
  color: string;
  /** Eligible as a starting club in the FTUE */
  starter?: boolean;
}

export interface Contract {
  /** €K per week */
  wage: number;
  yearsLeft: number;
}

export type FixtureKind = 'league' | 'cup' | 'intl' | 'tournament' | 'euro';

/** 1 = top flight, 2 = second tier, 3 = lower leagues */
export type Division = 1 | 2 | 3;
export type EuroComp = 'Champions League' | 'Europa League';
export type LeagueZone = 'champions' | 'europa' | 'promoted' | 'relegated' | 'safe';

/** How many places of the table lead somewhere (counted from the top, or the bottom for relegation). */
export interface SeasonZones {
  champions: number;
  europa: number;
  promo: number;
  relegation: number;
}
export type Outcome = 'W' | 'D' | 'L';

export interface FixtureResult {
  myScore: number;
  oppScore: number;
  shootout?: { my: number; opp: number };
  rating: number;
  goals: number;
  assists: number;
  outcome: Outcome;
  /** Started on the bench and came on */
  benched?: boolean;
  /** The coach took the player off after a poor showing */
  subbedOff?: boolean;
  /** The player was shown a red card */
  sentOff?: boolean;
  clutchWins?: number;
  clutchTotal?: number;
}

export interface DrawCandidate {
  opponent: string;
  opponentShort: string;
  opponentStrength: number;
  opponentColor: string;
}

export interface Fixture {
  id: string;
  kind: FixtureKind;
  /** e.g. "Matchday 3", "Cup Semi-Final" */
  label: string;
  opponent: string;
  opponentShort: string;
  opponentStrength: number;
  opponentColor: string;
  home: boolean;
  /** Draws are settled by a penalty shootout */
  knockout: boolean;
  /** false until the player has taken part in the draw (cup rounds, tournament stages) */
  drawn?: boolean;
  /** The balls in the pot: one of them becomes the opponent */
  pool?: DrawCandidate[];
  /** Youth national team fixture (absent = senior) */
  level?: 'U20' | 'U23';
  status: 'upcoming' | 'played' | 'skipped';
  result?: FixtureResult;
}

export interface TableRow {
  id: string;
  name: string;
  short: string;
  strength: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
  isMe?: boolean;
}

export interface TournamentTeam {
  name: string;
  /** Club colour (European draws); nations use their flag */
  color?: string;
  /** "🇸🇳 SEN" */
  short: string;
  strength: number;
}

export interface TournamentTie {
  a: string;
  b: string;
  ga?: number;
  gb?: number;
  /** Penalty shootout score (a, b) when the tie was level */
  pens?: [number, number];
  winner?: string;
}

/** A summer tournament: 16 nations, four groups of four, then quarter-finals to the final. */
export interface TournamentState {
  level: 'A' | 'U23' | 'U20';
  teams: Record<string, TournamentTeam>;
  /** Your nation (key in `teams`) */
  me: string;
  /** The 16 nations (you included) in four pots of four, strongest pot first */
  pots: string[][];
  /** The pots you draw from, strongest first (every pot but your own) */
  drawPots?: number[];
  /** Which pot each of your three group matches comes from */
  potOrder: number[];
  /** Filled once you have drawn your group */
  drawn: boolean;
  groups: TableRow[][];
  myGroup: number;
  /** Quarter-finals, semi-finals, final: ties appear as soon as they are known */
  rounds: { label: string; ties: TournamentTie[] }[];
  champion?: string;
}

export interface SeasonStats {
  apps: number;
  goals: number;
  assists: number;
  ratingSum: number;
}

export interface SeasonState {
  /** Start year of the season (2026 → "2026/27") */
  year: number;
  fixtures: Fixture[];
  cursor: number;
  table: TableRow[];
  cupAlive: boolean;
  tournamentAlive: boolean;
  tournamentName: string | null;
  /** International qualifier already scheduled this season */
  callUpQueued: boolean;
  /** The national coach left you out of the mid-season window / the summer tournament */
  callUpOmitted?: boolean;
  /** Points won in the qualifiers of this season's tournament (0–6) */
  qualPts?: number;
  /** Your nation failed to qualify for this summer's tournament */
  tournamentFailed?: boolean;
  tournamentOmitted?: boolean;
  /** Summer tournament fixtures already appended */
  tournamentQueued: boolean;
  /** Division played this season (absent on older saves = top flight) */
  division?: Division;
  zones?: SeasonZones;
  /** European competition played this season */
  europe?: EuroComp | null;
  /** Points collected in the European group stage */
  euroPts?: number;
  /** The European group: you and three foreign clubs */
  euroTable?: TableRow[];
  /** The European group draw (pots) of this season's campaign */
  euroDraw?: TournamentState | null;
  /** The summer tournament, once it is queued (older saves keep per-round draws without it) */
  tourney?: TournamentState | null;
  /** Training sessions used at the current cursor (capped per fixture) */
  training: { cursor: number; count: number };
  stats: SeasonStats;
  trophies: string[];
}

export interface Offer {
  id: string;
  clubId: string;
  /** Transfer fee in €M */
  fee: number;
  /** €K per week */
  wage: number;
  years: number;
  source: 'incoming' | 'approach' | 'renewal';
  note: string;
  /** A wage counter has already been attempted */
  countered?: boolean;
}

export interface EnergyState {
  bolts: number;
  /** Timestamp the regen clock was last aligned to */
  at: number;
}

export interface Upgrades {
  coach: number;
  pr: number;
  agent: number;
  nutrition: number;
}

export interface Player {
  name: string;
  nationality: string;
  position: Position;
  foot: Foot;
  age: number;
  attrs: Attributes;
  /** Fractional progress toward the next +1 in each attribute */
  xp: Attributes;
  rep: Reputation;
  /** 0-100 */
  morale: number;
  energy: EnergyState;
  clubId: string | null;
  contract: Contract | null;
  /** €K */
  money: number;
  form: number[];
  trophies: string[];
  totals: { apps: number; goals: number; assists: number; transfers: number };
  peakOvr: number;
  /** Head customisation (absent on saves made before the editor existed) */
  look?: Look;
  /** International record */
  national?: { caps: number; goals: number; youthCaps?: number };
  /** Recent dressing-room and press choices */
  talks?: TalkMemory;
  /** Match-day boosts owned (id → quantity) */
  boosts?: Record<string, number>;
  /** Scandal strikes — three and the club terminates the contract */
  strikes?: number;
  /** Permanent upgrades bought with money */
  upgrades?: Upgrades;
  /** Season (start year) of the last charity gala */
  donatedYear?: number;
}

export interface SeasonRecord {
  year: number;
  clubId: string;
  age: number;
  ovr: number;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  leaguePos: number;
  trophies: string[];
}

export interface SeasonSummary {
  record: SeasonRecord;
  ovrBefore: number;
  ovrAfter: number;
  delta: Attributes;
  contractExpiring: boolean;
  table: TableRow[];
  retiring: boolean;
  ballonDor?: BallonDorResult;
  /** Where the league finish leads */
  zone?: LeagueZone;
  division?: Division;
  nextDivision?: Division;
  nextEurope?: EuroComp | null;
}

export interface BallonDorEntry {
  name: string;
  club: string;
  score: number;
  isMe?: boolean;
}

export interface BallonDorResult {
  /** Final ranking of the top candidates (the player is always included) */
  ranking: BallonDorEntry[];
  rank: number;
  won: boolean;
}

export interface NewsItem {
  id: string;
  at: number;
  tone: 'good' | 'bad' | 'neutral' | 'gold';
  text: string;
}

export type GamePhase = 'playing' | 'season-end' | 'free-agent' | 'retired';

/* ───────────── Match engine types ───────────── */

/** What the tactical brief changes in a match. */
export interface Brief {
  /** Added to the player's effective OVR */
  perf?: number;
  /** Starting momentum (positive = my side on top) */
  momentum?: number;
  /** Extra fatigue (in lives) */
  fatigue?: number;
  myRateMul?: number;
  oppRateMul?: number;
  /** Added to every decision's chance */
  clutchBonus?: number;
  /** Raises the rating you are judged against */
  target?: number;
}

/** What the player has said lately: used to keep the conversations fresh. */
export interface TalkMemory {
  stances: string[];
  press: string[];
  speeches: string[];
  questions: string[];
  instructions: string[];
  /** -100 (hostile press) … 100 (friendly press) */
  mood: number;
}

export type Mentality = 'attack' | 'balanced' | 'defend';

export type StanceId = 'back-boss' | 'for-lads' | 'demand-ball' | 'crack-joke' | 'stay-quiet' | 'challenge-boss' | 'mentor';
export type Expectation = 'Modest' | 'Standard' | 'Star Role';

export interface MatchModifiers {
  /** Added to the player's effective OVR during the match */
  perfBonus: number;
  expectation: Expectation;
  /** Rating the player must reach to satisfy the expectation */
  ratingTarget: number;
  /** Tactical brief chosen after the talk */
  brief?: Brief;
}

export type MatchEventType =
  | 'kickoff'
  | 'chance'
  | 'goal'
  | 'save'
  | 'miss'
  | 'foul'
  | 'card'
  | 'sub'
  | 'clutch'
  | 'halftime'
  | 'fulltime';

export interface MatchEvent {
  id: number;
  minute: number;
  type: MatchEventType;
  side: 'me' | 'opp' | 'neutral';
  text: string;
  /** Marks events involving the user's player */
  star?: boolean;
}

export type KickKind = 'penalty' | 'freekick' | 'shootout';
export type Curl = 'left' | 'straight' | 'right';
/** Skill mini-games that replace the dice roll on some clutch options */
export type MiniKind =
  | 'power'
  | 'header'
  | 'tackle'
  | 'dribble'
  | 'sprint'
  | 'memory'
  | 'aim'
  | 'charge'
  // animated, scene-based games
  | 'slide'
  | 'slalom'
  | 'race'
  | 'block'
  | 'volley'
  | 'oneonone'
  | 'rebound';
export type MiniQuality = 'perfect' | 'good' | 'miss';
/** What a mini-game can add to its result: a reckless challenge is punished by the referee. */
export interface MiniExtra {
  card?: 'yellow' | 'red';
  /** The foul was inside the box: the opponent may get a penalty */
  inBox?: boolean;
}
export type KickResult = 'goal' | 'saved' | 'missed' | 'blocked';

export interface ClutchOption {
  id: string;
  label: string;
  hint: string;
  risk: 'Safe' | 'Balanced' | 'Bold';
  attr: AttrKey;
  /** Base success chance before attributes/momentum */
  base: number;
  /** A teammate's kick: the real conversion rate of the taker (replaces the scaled-down base) */
  taker?: number;
  /** When set, the choice opens a skill mini-game instead of rolling dice */
  mini?: MiniKind;
  /** What happens on success */
  onSuccess: 'goal' | 'assist' | 'momentum' | 'save' | 'kick-penalty' | 'kick-freekick';
  /** Narrative texts */
  successText: string;
  failText: string;
  /** Several possible ways for this decision to go wrong; when set it replaces `failText` */
  fail?: FailVariant[];
}

export interface FailVariant {
  text: string;
  w: number;
  /** card: booked; penalty: awarded after all (VAR); oppfk: free kick for the opponent */
  fx?: 'card' | 'penalty' | 'oppfk';
}

export interface ClutchMoment {
  id: string;
  title: string;
  setup: string;
  minute: number;
  options: ClutchOption[];
  /** Whether a failure concedes a counter-attack goal chance */
  defensive?: boolean;
}

export interface MatchState {
  minute: number;
  myScore: number;
  oppScore: number;
  /** -100 (opponent) .. +100 (me) */
  momentum: number;
  events: MatchEvent[];
  clutches: ClutchMoment[];
  nextClutch: number;
  status: 'playing' | 'clutch' | 'finished';
  rating: number;
  goals: number;
  assists: number;
  clutchWins: number;
  clutchTotal: number;
  shots: { me: number; opp: number };
  startMinute: number;
  eid: number;
  isStarter: boolean;
  /** The player failed to convert a penalty / free kick */
  missedKick: boolean;
  /** Team mentality for the whole match (changeable at any time) */
  mentality?: Mentality;
  /** A weaker opponent has a sudden big spell at this minute (a surprise you can't plan for) */
  surpriseAt?: number;
  /** Their spell lasts until this minute */
  surgeUntil?: number;
  /** The in-match team boost has been used */
  rallyUsed?: boolean;
  /** Added to every decision for the rest of the match (rally, second wind) */
  clutchBoost?: number;
  /** Minute the coach took the player off (or he was sent off), if it happened */
  subbedOffAt?: number;
  /** Yellow cards shown to the player */
  yellows?: number;
  /** Players sent off on each side */
  redsMe?: number;
  redsOpp?: number;
  /** The player himself was shown a red card */
  sentOff?: boolean;
}
