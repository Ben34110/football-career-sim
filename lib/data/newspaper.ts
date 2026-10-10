import type { FixtureKind, Outcome } from '../types';

export interface PaperCtx {
  name: string;
  club: string;
  opp: string;
  outcome: Outcome;
  /** Scores from the player's side */
  my: number;
  their: number;
  goals: number;
  assists: number;
  rating: number;
  label: string;
  kind: FixtureKind;
  home: boolean;
  missedKick: boolean;
  subbedOff: boolean;
  benched: boolean;
  shootout?: { my: number; opp: number };
  recent: Outcome[];
  /** Season matchday count (the edition number) */
  edition: number;
}

export interface FrontPage {
  outlet: string;
  tagline: string;
  headline: string;
  sub: string;
  caption: string;
  mood: 'joy' | 'sad' | 'neutral';
  /** Body paragraphs: English templates, filled with `vars` */
  paragraphs: string[];
  verdict: string;
  vars: Record<string, string | number>;
}

const OUTLETS: [string, string][] = [
  ['The Matchday Post', 'All the football, every day'],
  ['Foot Direct', 'Live from the touchline'],
  ['Sport Quotidien', 'Le journal du sport'],
  ['The Terrace Tribune', 'Voice of the supporters'],
];

const pick = <T,>(a: readonly T[], rng: () => number) => a[Math.floor(rng() * a.length)];

export const ratingVerdict = (r: number) => (r >= 8.5 ? 'Outstanding' : r >= 7.5 ? 'Excellent' : r >= 6.8 ? 'Good' : r >= 6 ? 'Average' : 'Poor');

/** A front page that changes with what happened: your goals, a missed penalty, a rout, a stalemate… */
export function buildFrontPage(c: PaperCtx, rng: () => number = Math.random): FrontPage {
  const [outlet, tagline] = pick(OUTLETS, rng);
  const diff = c.my - c.their;
  const final = c.label.endsWith('Final');
  const win = c.outcome === 'W';
  let headline: string;
  let mood: FrontPage['mood'] = win ? 'joy' : c.outcome === 'L' ? 'sad' : 'neutral';

  if (c.shootout && win) headline = pick(['{club} SURVIVE THE LOTTERY', 'NERVES OF STEEL: {club} WIN ON PENALTIES', '{club} THROUGH AFTER A PENALTY THRILLER', 'NERVES? WHAT NERVES? {club} WIN ON PENS'], rng);
  else if (c.shootout) headline = pick(['PENALTY HEARTBREAK FOR {club}', 'SHOOTOUT AGONY: {opp} KNOCK OUT {club}', 'THE PENALTY LOTTERY BITES {club}'], rng);
  else if (win && final) headline = pick(['CHAMPIONS! {club} WIN IT ALL', '{name} AND {club} WRITE HISTORY', 'GLORY NIGHT: {club} TAKE THE TROPHY', 'WE ARE THE CHAMPIONS! {club} LIFT THE TROPHY', 'PARTY TIME: {club} WIN IT ALL'], rng);
  else if (c.goals >= 3) headline = pick(['HAT-TRICK HERO {name}!', '{name} DEMOLISHES {opp} SINGLE-HANDEDLY', 'THREE-GOAL {name} STEALS THE SHOW', '{name} TAKES THE MATCH BALL HOME', 'WHO NEEDS A TEAM? {name} SCORES THREE'], rng);
  else if (c.goals === 2) headline = pick(['DOUBLE TROUBLE FOR {opp}', '{name} STRIKES TWICE', 'TWICE IS NICE: {name} DECIDES IT', 'NOT HAPPY? HERE IS A BRACE FROM {name}!', '{name} MAKES IT TWO AND ASKS FOR MORE'], rng);
  else if (c.goals === 1 && win && diff === 1) headline = pick(['{name} THE MATCH-WINNER', 'SUPER {name} SPARKS {club} VICTORY', 'ONE GOAL, THREE POINTS: THANKS {name}', 'WHO IS THE BOSS? {name}!', '{name}: ONE SHOT, ONE GOAL, ZERO REGRETS'], rng);
  else if (c.assists >= 1 && win) headline = pick(['{name} PULLS THE STRINGS', 'THE ARCHITECT: {name} CREATES THE WINNER', '{name} WITH THE PASS OF THE DAY'], rng);
  else if (c.benched && (c.goals > 0 || c.assists > 0)) headline = pick(['SUPER-SUB {name} CHANGES THE GAME', 'FROM THE BENCH TO THE HEADLINES: {name}', 'SUPER-SUB {name}: THE BENCH STRIKES BACK'], rng);
  else if (win && diff >= 3) headline = pick(['{club} TEAR {opp} APART', 'ROUT! {club} RUN RIOT AGAINST {opp}', '{opp} GET THE POWER-WASH TREATMENT', '{club} PUT THE BEST CHINA ON THE TABLE'], rng);
  else if (win) headline = pick(['{club} GRIND OUT THE WIN', 'THREE POINTS FOR {club}', '{club} DO THE JOB AGAINST {opp}', 'NOTHING TO SEE HERE: {club} WIN', 'ANOTHER DAY, ANOTHER THREE POINTS'], rng);
  else if (c.outcome === 'D') headline = pick(['HONOURS EVEN: {club} AND {opp} SHARE THE POINTS', 'STALEMATE: {my}–{their}', 'NO WINNER AS {club} HELD BY {opp}', 'TAKE THE POINT AND GO HOME: {my}–{their}', 'NEITHER HOT NOR COLD: {my}–{their}'], rng);
  else if (c.missedKick) headline = pick(['THE KICK THAT HAUNTS {name}', '{name} FLUFFS THE BIG MOMENT AS {club} FALL', '{name}\'S PENALTY ORBITS THE MOON', '12 YARDS, ONE GOAL, ONE BIG MISS: {name}'], rng);
  else if (c.subbedOff) headline = pick(['{name} HAULED OFF IN {club} DEFEAT', 'DISASTER: {club} LOSE AND {name} IS SUBSTITUTED', '{name} IS OFF BEFORE DESSERT', 'THE COACH PULLS THE PLUG ON {name}'], rng);
  else if (c.rating < 5.8) headline = pick(['MISSING IN ACTION: {name} FAILS TO SHINE', '{opp} STUN {club} AS {name} STRUGGLES', 'WHERE WAS {name}? NOBODY KNOWS', 'IT IS THE REF’S FAULT AGAIN: {club} FALL', 'BACK TO THE DRAWING BOARD FOR {club}', '{opp} SEND {club} HOME TO MUM'], rng);
  else headline = pick(['{opp} STUN {club}', '{club} FALL SHORT AGAINST {opp}', 'BEATEN: {club} LOSE {their}–{my}'], rng);

  // the second line: what the player did
  let sub: string;
  if (c.goals >= 1) sub = c.goals === 1 ? '{name} scores as {club} {resultVerb} {opp} {score}.' : '{name} scores {goals} as {club} {resultVerb} {opp} {score}.';
  else if (c.assists >= 1) sub = '{name} sets up {assists} as {club} {resultVerb} {opp} {score}.';
  else sub = '{club} {resultVerb} {opp} {score}.';

  const resultVerb = win ? 'beat' : c.outcome === 'D' ? 'draw with' : 'lose to';
  const score = `${c.home ? c.my : c.their}–${c.home ? c.their : c.my}`;

  const paragraphs: string[] = [];
  if (c.shootout) paragraphs.push('After a {score} draw it went to penalties, and {club} {psWord} {ps}.');
  else if (win) paragraphs.push(diff >= 3 ? '{club} were ruthless, running out {score} winners over {opp} in the {comp}.' : '{club} came through a tight {comp} tie against {opp}, finishing {score}.');
  else if (c.outcome === 'D') paragraphs.push('{club} and {opp} could not be separated in the {comp}, ending {score}.');
  else paragraphs.push('{opp} had the better of the {comp} meeting, winning {score} and leaving {club} to regret missed chances.');

  if (c.goals >= 1) paragraphs.push(c.goals >= 3 ? '{name} was unplayable, scoring {goals} and dragging {club} along.' : '{name} was on target, a reward for a sharp performance.');
  else if (c.assists >= 1) paragraphs.push('{name} did not score, but the creativity came from them: {assists} assist(s) tell the story.');
  else if (c.benched) paragraphs.push('{name} started on the bench and came on to try and change things.');
  else if (c.missedKick) paragraphs.push('{name} had the chance to change the story from the spot, but could not find the net.');
  else if (c.subbedOff) paragraphs.push('{name} was taken off before the end after a below-par display.');
  else paragraphs.push('{name} worked hard but could not find a decisive moment.');

  const streak = c.recent.length >= 3 && c.recent.slice(-3).every((r) => r === 'W') ? 'W' : c.recent.length >= 3 && c.recent.slice(-3).every((r) => r === 'L') ? 'L' : null;
  if (streak === 'W') paragraphs.push('That is three wins on the bounce — the confidence around the club is sky-high.');
  if (streak === 'L') paragraphs.push('Three defeats in a row: the pressure is now building around the club.');

  const caption = c.goals >= 1
    ? pick(['{name} celebrates in front of the fans.', '{name} unveils the celebration rehearsed in the mirror.'], rng)
    : c.outcome === 'L'
      ? pick(['{name} leaves the pitch dejected.', '{name} blames the pitch. Obviously.', '{name} looks for the exit.'], rng)
      : c.outcome === 'D'
        ? pick(['{name} shares a word with the opposition.', '{name} checks the scoreboard twice.'], rng)
        : pick(['{name} salutes the supporters.', '{name} promises to buy the next round.'], rng);
  if (c.goals >= 1) mood = 'joy';

  const compName = c.kind === 'league' ? 'league' : c.kind === 'cup' ? 'cup' : c.kind === 'euro' ? 'European' : 'international';
  return {
    outlet,
    tagline,
    headline,
    sub,
    caption,
    mood,
    paragraphs,
    verdict: ratingVerdict(c.rating),
    vars: {
      name: c.name.trim().split(/\s+/).slice(-1)[0] || c.name,
      club: c.club,
      opp: c.opp,
      my: c.my,
      their: c.their,
      goals: c.goals,
      assists: c.assists,
      score,
      resultVerb,
      comp: compName,
      ps: c.shootout ? `${c.shootout.my}–${c.shootout.opp}` : '',
      psWord: c.shootout && c.shootout.my > c.shootout.opp ? 'won' : 'lost',
    },
  };
}
