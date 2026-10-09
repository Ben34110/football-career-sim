import { AMBIENT, fill } from '../data/commentary';
import { CLUTCH_DECK } from '../data/clutch';
import { SURNAMES } from '../data/names';
import type {
  Attributes,
  ClutchMoment,
  ClutchOption,
  FixtureKind,
  FixtureResult,
  KickKind,
  KickResult,
  MatchEvent,
  MatchEventType,
  MatchModifiers,
  MatchState,
  MiniQuality,
  Position,
  Reputation,
} from '../types';
import { translate as tr } from '../i18n';
import { clamp, randInt, weightedPick, type Rng } from './rng';

/** Everything the engine needs to know about the context of a match. */
export interface MatchCtx {
  playerName: string;
  position: Position;
  attrs: Attributes;
  ovr: number;
  morale: number;
  boltsBefore: number;
  rep: Reputation;
  myTeam: string;
  oppName: string;
  /** Effective player rating this match (OVR + bonuses − fatigue) */
  effOvr: number;
  myStr: number;
  oppStr: number;
  home: boolean;
  knockout: boolean;
  kind: FixtureKind;
  mods: MatchModifiers;
  /** The coach has left the player on the bench to start */
  benched: boolean;
  /** Display only: the player's side is the home team (national games are neutral for the engine) */
  meHome: boolean;
}

export interface BuildCtxInput {
  playerName: string;
  position: Position;
  attrs: Attributes;
  ovr: number;
  morale: number;
  boltsBefore: number;
  rep: Reputation;
  myTeam: string;
  /** Base strength of the team being represented (club or nation) */
  teamStrength: number;
  oppName: string;
  oppStrength: number;
  home: boolean;
  knockout: boolean;
  kind: FixtureKind;
  mods: MatchModifiers;
  benched: boolean;
  meHome: boolean;
  /** Levels of the nutrition upgrade: that many lives of fatigue are ignored */
  fatigueRelief?: number;
}

/**
 * Does the coach leave the player out of the starting XI?
 * Low trust, or a run of poor ratings with only moderate trust. National teams always start you.
 */
export function startsOnBench(coachTrust: number, form: number[], kind: FixtureKind): boolean {
  if (kind === 'intl' || kind === 'tournament') return false;
  if (coachTrust < 25) return true;
  const last = form.slice(-3);
  if (last.length >= 3) {
    const avg = last.reduce((a, b) => a + b, 0) / last.length;
    if (avg < 5.9 && coachTrust < 55) return true;
  }
  return false;
}

export function buildCtx(i: BuildCtxInput): MatchCtx {
  const fatigue = Math.max(0, 5 - i.boltsBefore - (i.fatigueRelief ?? 0));
  const effOvr = i.ovr + i.mods.perfBonus + (i.morale - 50) / 12 - fatigue;
  const home = i.home ? 1.5 + (i.rep.fanPopularity - 50) / 40 : 0;
  const myStr = i.teamStrength + (effOvr - i.teamStrength) * 0.12 + (i.rep.lockerRoom - 50) / 25 + home;
  return {
    playerName: i.playerName,
    position: i.position,
    attrs: i.attrs,
    ovr: i.ovr,
    morale: i.morale,
    boltsBefore: i.boltsBefore,
    rep: i.rep,
    myTeam: i.myTeam,
    oppName: i.oppName,
    effOvr,
    myStr,
    oppStr: i.oppStrength,
    home: i.home,
    knockout: i.knockout,
    kind: i.kind,
    mods: i.mods,
    benched: i.benched,
    meHome: i.meHome,
  };
}

/** Scores read home–away, so an away player's goals go second. */
const sc = (ctx: MatchCtx, mine: number, theirs: number) => (ctx.meHome ? { a: mine, b: theirs } : { a: theirs, b: mine });
const sides = (ctx: MatchCtx) => (ctx.meHome ? { home: ctx.myTeam, away: ctx.oppName } : { home: ctx.oppName, away: ctx.myTeam });

const surname = (name: string) => name.trim().split(/\s+/).slice(-1)[0] || name;

/* ───────────── Setup ───────────── */

function scheduleClutches(startMinute: number, starter: boolean, rng: Rng): ClutchMoment[] {
  const count = starter ? (rng() < 0.5 ? 3 : 4) : 3;
  const lo = startMinute + 7;
  const hi = 87;
  const span = (hi - lo) / count;
  const pool = [...CLUTCH_DECK];
  const out: ClutchMoment[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = weightedPick(pool, (t) => t.weight, rng);
    pool.splice(pool.indexOf(tpl), 1);
    const minute = Math.floor(lo + span * i + rng() * Math.max(0, span - 8));
    const { weight: _w, ...rest } = tpl;
    void _w;
    out.push({ ...rest, id: `${tpl.id}-${i}`, minute });
  }
  return out;
}

export function createMatch(ctx: MatchCtx, rng: Rng): MatchState {
  const isStarter = !ctx.benched;
  const startMinute = isStarter ? 0 : 55;
  let m: MatchState = {
    minute: 0,
    myScore: 0,
    oppScore: 0,
    momentum: 0,
    events: [],
    clutches: scheduleClutches(startMinute, isStarter, rng),
    nextClutch: 0,
    status: 'playing',
    rating: 6,
    goals: 0,
    assists: 0,
    clutchWins: 0,
    clutchTotal: 0,
    shots: { me: 0, opp: 0 },
    startMinute,
    eid: 0,
    isStarter,
    missedKick: false,
  };
  m = push(m, 0, 'kickoff', 'neutral', tr('Kick-off! {me} vs {opp}.', { me: ctx.myTeam, opp: ctx.oppName }));
  if (!isStarter) {
    m = push(m, 0, 'sub', 'me', tr('{who} starts on the bench. The gaffer is not convinced yet.', { who: surname(ctx.playerName) }), true);
    // Silently play out the first 55 minutes without the player
    while (m.minute < startMinute) m = tickMatch(m, ctx, rng);
    m = push(m, m.minute, 'sub', 'me', tr('🔁 {who} comes on — time to make an impact!', { who: surname(ctx.playerName) }), true);
  }
  return m;
}

function push(m: MatchState, minute: number, type: MatchEventType, side: MatchEvent['side'], text: string, star = false): MatchState {
  const eid = m.eid + 1;
  return { ...m, eid, events: [...m.events, { id: eid, minute, type, side, text, star }] };
}

/* ───────────── Live ticks ───────────── */

const POSITION_SHARE: Record<Position, number> = { ST: 0.24, CAM: 0.14, RW: 0.17, LW: 0.17 };

export function tickMatch(input: MatchState, ctx: MatchCtx, rng: Rng): MatchState {
  if (input.status !== 'playing') return input;

  const upcoming = input.clutches[input.nextClutch];
  if (upcoming && input.minute >= upcoming.minute) {
    return push({ ...input, status: 'clutch' }, input.minute, 'clutch', 'me', `⚡ ${tr(upcoming.title)}`, true);
  }

  let m: MatchState = { ...input, shots: { ...input.shots } };
  const prev = m.minute;
  m.minute = Math.min(90, prev + 3);
  const at = () => Math.min(90, prev + randInt(1, 3, rng));
  const who = surname(ctx.playerName);

  // A poor showing: the coach may pull the player off (never in international games)
  if (m.subbedOffAt === undefined && prev >= 55 && prev <= 80 && ctx.kind !== 'intl' && ctx.kind !== 'tournament') {
    const bad = m.rating <= 5.2 ? 0.55 : m.rating <= 5.7 ? 0.3 : 0;
    const patience = clamp(1.25 - ctx.rep.coachTrust / 100, 0.35, 1.2);
    if (bad > 0 && rng() < bad * patience) {
      const minute = Math.min(88, m.minute);
      m = {
        ...m,
        subbedOffAt: minute,
        rating: m.rating - 0.2,
        // the remaining decisions are no longer yours
        clutches: m.clutches.slice(0, m.nextClutch),
      };
      m = push(m, minute, 'sub', 'me', tr('🔁 The coach has seen enough — {who} is substituted.', { who }), true);
      // Off the pitch: the match stops for the player — except in knockout ties, where the result still matters
      if (!ctx.knockout) {
        while (m.status === 'playing') m = tickMatch(m, ctx, rng);
        return m;
      }
    }
  }
  const playerOn = m.minute > m.startMinute && (m.subbedOffAt === undefined || m.minute <= m.subbedOffAt);

  if (prev < 45 && m.minute >= 45) {
    m = push(m, 45, 'halftime', 'neutral', tr('Half-time: {home} {a}–{b} {away}.', { ...sides(ctx), ...sc(ctx, m.myScore, m.oppScore) }));
  }

  const d = ctx.myStr - ctx.oppStr;
  const myRate = clamp(0.13 * Math.exp(d / 45 + m.momentum / 300), 0.04, 0.45);
  const oppRate = clamp(0.19 * Math.exp(-d / 45 - m.momentum / 300), 0.04, 0.45);
  const myConv = clamp(0.18 * Math.exp(d / 70), 0.08, 0.38);
  const oppConv = clamp(0.22 * Math.exp(-d / 70), 0.08, 0.38);
  const vars = { me: ctx.myTeam, opp: ctx.oppName };

  // My team attacks
  if (rng() < myRate) {
    m.shots.me += 1;
    if (rng() < myConv) {
      const share = POSITION_SHARE[ctx.position] * clamp(1 + (ctx.effOvr - 70) / 120, 0.6, 1.5);
      const mate = SURNAMES[randInt(0, SURNAMES.length - 1, rng)];
      if (playerOn && rng() < share) {
        m = { ...m, myScore: m.myScore + 1, goals: m.goals + 1, rating: m.rating + 1, momentum: clamp(m.momentum + 22, -100, 100) };
        m = push(m, at(), 'goal', 'me', tr('⚽ GOAL! {who} finishes it off for {me}! {a}–{b}', { who, me: ctx.myTeam, ...sc(ctx, m.myScore, m.oppScore) }), true);
      } else if (playerOn && rng() < 0.14 * clamp(1 + (ctx.attrs.vision - 70) / 80, 0.6, 1.5)) {
        m = { ...m, myScore: m.myScore + 1, assists: m.assists + 1, rating: m.rating + 0.6, momentum: clamp(m.momentum + 22, -100, 100) };
        m = push(m, at(), 'goal', 'me', tr('⚽ GOAL! {mate} scores from {who}’s pinpoint pass! {a}–{b}', { mate, who, ...sc(ctx, m.myScore, m.oppScore) }), true);
      } else {
        m = { ...m, myScore: m.myScore + 1, momentum: clamp(m.momentum + 22, -100, 100) };
        m = push(m, at(), 'goal', 'me', tr('⚽ GOAL! {mate} scores for {me}! {a}–{b}', { mate, me: ctx.myTeam, ...sc(ctx, m.myScore, m.oppScore) }));
      }
    } else {
      const text = fill(AMBIENT.mySave[randInt(0, AMBIENT.mySave.length - 1, rng)], vars);
      const type: MatchEventType = rng() < 0.5 ? 'save' : 'miss';
      m = { ...m, momentum: clamp(m.momentum + 5, -100, 100) };
      m = push(m, at(), type, 'me', `${fill(AMBIENT.myChance[randInt(0, AMBIENT.myChance.length - 1, rng)], vars)} ${text}`);
    }
  }

  // Opposition attacks
  if (rng() < oppRate) {
    m.shots.opp += 1;
    if (rng() < oppConv) {
      const mate = SURNAMES[randInt(0, SURNAMES.length - 1, rng)];
      m = { ...m, oppScore: m.oppScore + 1, momentum: clamp(m.momentum - 22, -100, 100) };
      m = push(m, at(), 'goal', 'opp', tr('💔 {opp} score! {mate} finds the net. {a}–{b}', { opp: ctx.oppName, mate, ...sc(ctx, m.myScore, m.oppScore) }));
    } else {
      const text = fill(AMBIENT.oppSave[randInt(0, AMBIENT.oppSave.length - 1, rng)], vars);
      m = { ...m, momentum: clamp(m.momentum - 5, -100, 100) };
      m = push(m, at(), 'chance', 'opp', `${fill(AMBIENT.oppChance[randInt(0, AMBIENT.oppChance.length - 1, rng)], vars)} ${text}`);
    }
  } else if (rng() < 0.06) {
    const isCard = rng() < 0.4;
    const text = isCard
      ? fill(AMBIENT.card[randInt(0, AMBIENT.card.length - 1, rng)], { who: SURNAMES[randInt(0, SURNAMES.length - 1, rng)] })
      : tr(AMBIENT.foul[randInt(0, AMBIENT.foul.length - 1, rng)]);
    m = push(m, at(), isCard ? 'card' : 'foul', 'neutral', text);
  }

  // Momentum decays toward 0 with a little noise
  m.momentum = clamp(Math.round(m.momentum * (0.88 + (rng() - 0.5) * 0.06)), -100, 100);

  if (m.minute >= 90) {
    m = push({ ...m, status: 'finished' }, 90, 'fulltime', 'neutral', tr('Full-time: {home} {a}–{b} {away}.', { ...sides(ctx), ...sc(ctx, m.myScore, m.oppScore) }));
  }
  return m;
}

/* ───────────── Clutch moments ───────────── */

export function successChance(opt: ClutchOption, ctx: MatchCtx, m: MatchState): number {
  if (opt.base >= 1) return 1;
  const attr = ctx.attrs[opt.attr];
  // Better opposition makes every decision harder
  const opposition = (ctx.oppStr - ctx.myStr) / 140;
  return clamp(
    opt.base * 0.52 + (attr - 70) / 240 + m.momentum / 650 + ctx.mods.perfBonus / 150 + (ctx.morale - 50) / 500 - Math.max(0, 5 - ctx.boltsBefore) / 90 - opposition,
    0.05,
    0.86,
  );
}

export interface ClutchResolution {
  state: MatchState;
  success: boolean;
  /** Set when the choice opens the 8-zone goal UI */
  kick?: KickKind;
  /** Set when the choice opens a skill mini-game */
  mini?: ClutchOption['mini'];
}

const findOption = (m: MatchState, optionId: string) => {
  const moment = m.clutches[m.nextClutch];
  return { moment, opt: moment.options.find((o) => o.id === optionId) ?? moment.options[0] };
};

export function resolveClutch(m: MatchState, ctx: MatchCtx, optionId: string, rng: Rng): ClutchResolution {
  const { opt } = findOption(m, optionId);
  // Skill options are decided by the player's hands, not by dice
  if (opt.mini) return { state: m, success: false, mini: opt.mini };
  return settleOption(m, ctx, opt, rng() < successChance(opt, ctx, m), rng);
}

/** Result of a mini-game → probability of the option succeeding. */
export function miniSuccessChance(opt: ClutchOption, ctx: MatchCtx, m: MatchState, q: MiniQuality): number {
  const base = successChance(opt, ctx, m);
  if (q === 'perfect') return clamp(base + 0.26, 0.45, 0.82);
  if (q === 'good') return clamp(base * 1.05, 0.08, 0.6);
  return clamp(base * 0.12, 0.02, 0.12);
}

export function resolveMini(m: MatchState, ctx: MatchCtx, optionId: string, q: MiniQuality, rng: Rng): ClutchResolution {
  const { opt } = findOption(m, optionId);
  return settleOption(m, ctx, opt, rng() < miniSuccessChance(opt, ctx, m, q), rng);
}

function settleOption(m: MatchState, ctx: MatchCtx, opt: ClutchOption, success: boolean, rng: Rng): ClutchResolution {
  const moment = m.clutches[m.nextClutch];
  const who = surname(ctx.playerName);
  const said = (text: string) => tr(text);

  if (success && (opt.onSuccess === 'kick-penalty' || opt.onSuccess === 'kick-freekick')) {
    const kick: KickKind = opt.onSuccess === 'kick-penalty' ? 'penalty' : 'freekick';
    const text =
      kick === 'penalty'
        ? tr('🎯 {who} {act}. Penalty to {me}!', { who, act: said(opt.successText), me: ctx.myTeam })
        : tr('🎯 {who} {act}.', { who, act: said(opt.successText) });
    return { state: push(m, m.minute, 'clutch', 'me', text, true), success: true, kick };
  }

  let s: MatchState = { ...m, clutchTotal: m.clutchTotal + 1, nextClutch: m.nextClutch + 1, status: 'playing' };
  s.minute = Math.min(89, s.minute + 1);
  const act = said(opt.successText);

  if (success) {
    s.clutchWins += 1;
    switch (opt.onSuccess) {
      case 'goal':
        s = { ...s, myScore: s.myScore + 1, goals: s.goals + 1, rating: s.rating + 1, momentum: clamp(s.momentum + 28, -100, 100) };
        s = push(s, s.minute, 'goal', 'me', tr('⚽ GOAL! {who} {act}! {a}–{b}', { who, act, ...sc(ctx, s.myScore, s.oppScore) }), true);
        break;
      case 'assist':
        s = { ...s, myScore: s.myScore + 1, assists: s.assists + 1, rating: s.rating + 0.65, momentum: clamp(s.momentum + 25, -100, 100) };
        s = push(s, s.minute, 'goal', 'me', tr('⚽ GOAL! {who} {act}! {a}–{b}', { who, act, ...sc(ctx, s.myScore, s.oppScore) }), true);
        break;
      case 'save':
        s = { ...s, rating: s.rating + 0.35, momentum: clamp(s.momentum + 12, -100, 100) };
        s = push(s, s.minute, 'clutch', 'me', `🛡️ ${who} ${act}.`, true);
        break;
      default:
        s = { ...s, rating: s.rating + 0.25, momentum: clamp(s.momentum + 30, -100, 100) };
        s = push(s, s.minute, 'clutch', 'me', `🔥 ${who} ${act}.`, true);
    }
    return { state: s, success: true };
  }

  // Failure
  s = { ...s, rating: s.rating - 0.2, momentum: clamp(s.momentum - 12, -100, 100) };
  s = push(s, s.minute, 'miss', 'me', `😬 ${who} ${said(opt.failText)}.`, true);
  if (moment.defensive && rng() < 0.55) {
    s = { ...s, oppScore: s.oppScore + 1, rating: s.rating - 0.4, momentum: clamp(s.momentum - 20, -100, 100) };
    s = push(s, s.minute, 'goal', 'opp', tr('💔 {opp} punish the mistake and score! {a}–{b}', { opp: ctx.oppName, ...sc(ctx, s.myScore, s.oppScore) }));
  }
  return { state: s, success: false };
}

/** Called once the 8-zone goal UI has produced a result. */
export function applyKick(m: MatchState, ctx: MatchCtx, kind: KickKind, result: KickResult, curled = false): MatchState {
  const who = surname(ctx.playerName);
  const label = tr(kind === 'penalty' ? 'penalty' : 'free kick');
  let s: MatchState = { ...m, clutchTotal: m.clutchTotal + 1, nextClutch: m.nextClutch + 1, status: 'playing' };
  s.minute = Math.min(89, s.minute + 1);
  if (result === 'goal') {
    s = { ...s, clutchWins: s.clutchWins + 1, myScore: s.myScore + 1, goals: s.goals + 1, rating: s.rating + (curled ? 1.3 : 1.1), momentum: clamp(s.momentum + 30, -100, 100) };
    const text = curled
      ? tr('⚽ GOAL! {who} bends the free kick around the wall! {a}–{b}', { who, ...sc(ctx, s.myScore, s.oppScore) })
      : tr('⚽ GOAL! {who} converts the {label}! {a}–{b}', { who, label, ...sc(ctx, s.myScore, s.oppScore) });
    return push(s, s.minute, 'goal', 'me', text, true);
  }
  const text: Record<Exclude<KickResult, 'goal'>, string> = {
    saved: tr('🧤 SAVED! The keeper denies {who} from the {label}.', { who, label }),
    missed: tr('😱 {who} blazes the {label} wide!', { who, label }),
    blocked: tr('🧱 {who}’s free kick crashes into the wall.', { who }),
  };
  s = { ...s, missedKick: true, rating: s.rating - 0.5, momentum: clamp(s.momentum - 18, -100, 100) };
  return push(s, s.minute, 'miss', 'me', text[result as Exclude<KickResult, 'goal'>], true);
}

/* ───────────── Pressure & results ───────────── */

export function pressureFor(m: MatchState, ctx: MatchCtx): number {
  const base: Record<FixtureKind, number> = { league: 0.15, cup: 0.35, intl: 0.4, tournament: 0.55 };
  let p = base[ctx.kind];
  if (m.minute > 75) p += 0.2;
  if (Math.abs(m.myScore - m.oppScore) <= 1) p += 0.15;
  return clamp(p, 0, 1);
}

export function buildResult(
  m: MatchState,
  ctx: MatchCtx,
  shootout: { my: number; opp: number } | null,
  extraRating: number,
  rng: Rng,
): FixtureResult {
  let outcome: FixtureResult['outcome'];
  if (m.myScore > m.oppScore) outcome = 'W';
  else if (m.myScore < m.oppScore) outcome = 'L';
  else if (shootout) outcome = shootout.my > shootout.opp ? 'W' : 'L';
  else outcome = 'D';

  let rating = m.rating + extraRating + (outcome === 'W' ? 0.35 : outcome === 'L' ? -0.3 : 0) + (rng() - 0.5) * 0.4;
  if (!m.isStarter) rating = 6 + (rating - 6) * 0.85;
  rating = Math.round(clamp(rating, 3.5, 10) * 10) / 10;

  return {
    myScore: m.myScore,
    oppScore: m.oppScore,
    shootout: shootout ?? undefined,
    rating,
    goals: m.goals,
    assists: m.assists,
    outcome,
    benched: !m.isStarter || undefined,
    subbedOff: m.subbedOffAt !== undefined || undefined,
    clutchWins: m.clutchWins,
    clutchTotal: m.clutchTotal,
  };
}
