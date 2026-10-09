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
  Position,
  Reputation,
} from '../types';
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
}

export function buildCtx(i: BuildCtxInput): MatchCtx {
  const fatigue = 5 - i.boltsBefore;
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
  };
}

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
  const isStarter = ctx.kind === 'intl' || ctx.kind === 'tournament' || ctx.rep.coachTrust >= 25;
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
  m = push(m, 0, 'kickoff', 'neutral', `Kick-off! ${ctx.myTeam} vs ${ctx.oppName}.`);
  if (!isStarter) {
    m = push(m, 0, 'sub', 'me', `${surname(ctx.playerName)} starts on the bench. The gaffer is not convinced yet.`, true);
    // Silently play out the first 55 minutes without the player
    while (m.minute < startMinute) m = tickMatch(m, ctx, rng);
    m = push(m, m.minute, 'sub', 'me', `🔁 ${surname(ctx.playerName)} comes on — time to make an impact!`, true);
  }
  return m;
}

function push(m: MatchState, minute: number, type: MatchEventType, side: MatchEvent['side'], text: string, star = false): MatchState {
  const eid = m.eid + 1;
  return { ...m, eid, events: [...m.events, { id: eid, minute, type, side, text, star }] };
}

/* ───────────── Live ticks ───────────── */

const POSITION_SHARE: Record<Position, number> = { ST: 0.32, CAM: 0.2, RW: 0.24, LW: 0.24 };

export function tickMatch(input: MatchState, ctx: MatchCtx, rng: Rng): MatchState {
  if (input.status !== 'playing') return input;

  const upcoming = input.clutches[input.nextClutch];
  if (upcoming && input.minute >= upcoming.minute) {
    return push({ ...input, status: 'clutch' }, input.minute, 'clutch', 'me', `⚡ ${upcoming.title}`, true);
  }

  let m: MatchState = { ...input, shots: { ...input.shots } };
  const prev = m.minute;
  m.minute = Math.min(90, prev + 3);
  const at = () => Math.min(90, prev + randInt(1, 3, rng));
  const playerOn = m.minute > m.startMinute;
  const who = surname(ctx.playerName);

  if (prev < 45 && m.minute >= 45) {
    m = push(m, 45, 'halftime', 'neutral', `Half-time: ${ctx.myTeam} ${m.myScore}–${m.oppScore} ${ctx.oppName}.`);
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
        m = push(m, at(), 'goal', 'me', `⚽ GOAL! ${who} finishes it off for ${ctx.myTeam}! ${m.myScore}–${m.oppScore}`, true);
      } else if (playerOn && rng() < 0.2 * clamp(1 + (ctx.attrs.vision - 70) / 80, 0.6, 1.5)) {
        m = { ...m, myScore: m.myScore + 1, assists: m.assists + 1, rating: m.rating + 0.6, momentum: clamp(m.momentum + 22, -100, 100) };
        m = push(m, at(), 'goal', 'me', `⚽ GOAL! ${mate} scores from ${who}’s pinpoint pass! ${m.myScore}–${m.oppScore}`, true);
      } else {
        m = { ...m, myScore: m.myScore + 1, momentum: clamp(m.momentum + 22, -100, 100) };
        m = push(m, at(), 'goal', 'me', `⚽ GOAL! ${mate} puts ${ctx.myTeam} ahead on the scoresheet! ${m.myScore}–${m.oppScore}`);
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
      m = push(m, at(), 'goal', 'opp', `💔 ${ctx.oppName} score! ${mate} finds the net. ${m.myScore}–${m.oppScore}`);
    } else {
      const text = fill(AMBIENT.oppSave[randInt(0, AMBIENT.oppSave.length - 1, rng)], vars);
      m = { ...m, momentum: clamp(m.momentum - 5, -100, 100) };
      m = push(m, at(), 'chance', 'opp', `${fill(AMBIENT.oppChance[randInt(0, AMBIENT.oppChance.length - 1, rng)], vars)} ${text}`);
    }
  } else if (rng() < 0.06) {
    const isCard = rng() < 0.4;
    const text = isCard
      ? fill(AMBIENT.card[randInt(0, AMBIENT.card.length - 1, rng)], { who: SURNAMES[randInt(0, SURNAMES.length - 1, rng)] })
      : AMBIENT.foul[randInt(0, AMBIENT.foul.length - 1, rng)];
    m = push(m, at(), isCard ? 'card' : 'foul', 'neutral', text);
  }

  // Momentum decays toward 0 with a little noise
  m.momentum = clamp(Math.round(m.momentum * (0.88 + (rng() - 0.5) * 0.06)), -100, 100);

  if (m.minute >= 90) {
    m = push({ ...m, status: 'finished' }, 90, 'fulltime', 'neutral', `Full-time: ${ctx.myTeam} ${m.myScore}–${m.oppScore} ${ctx.oppName}.`);
  }
  return m;
}

/* ───────────── Clutch moments ───────────── */

export function successChance(opt: ClutchOption, ctx: MatchCtx, m: MatchState): number {
  if (opt.base >= 1) return 1;
  const attr = ctx.attrs[opt.attr];
  return clamp(
    opt.base * 0.82 + (attr - 70) / 180 + m.momentum / 500 + ctx.mods.perfBonus / 100 + (ctx.morale - 50) / 400 - (5 - ctx.boltsBefore) / 100,
    0.08,
    0.93,
  );
}

export interface ClutchResolution {
  state: MatchState;
  success: boolean;
  /** Set when the choice opens the 8-zone goal UI */
  kick?: KickKind;
}

export function resolveClutch(m: MatchState, ctx: MatchCtx, optionId: string, rng: Rng): ClutchResolution {
  const moment = m.clutches[m.nextClutch];
  const opt = moment.options.find((o) => o.id === optionId) ?? moment.options[0];
  const who = surname(ctx.playerName);
  const success = rng() < successChance(opt, ctx, m);

  if (success && (opt.onSuccess === 'kick-penalty' || opt.onSuccess === 'kick-freekick')) {
    const kick: KickKind = opt.onSuccess === 'kick-penalty' ? 'penalty' : 'freekick';
    const text =
      kick === 'penalty'
        ? `🎯 ${who} ${opt.successText}. Penalty to ${ctx.myTeam}!`
        : `🎯 ${who} ${opt.successText}.`;
    return { state: push(m, m.minute, 'clutch', 'me', text, true), success: true, kick };
  }

  let s: MatchState = { ...m, clutchTotal: m.clutchTotal + 1, nextClutch: m.nextClutch + 1, status: 'playing' };
  s.minute = Math.min(89, s.minute + 1);

  if (success) {
    s.clutchWins += 1;
    switch (opt.onSuccess) {
      case 'goal':
        s = { ...s, myScore: s.myScore + 1, goals: s.goals + 1, rating: s.rating + 1, momentum: clamp(s.momentum + 28, -100, 100) };
        s = push(s, s.minute, 'goal', 'me', `⚽ GOAL! ${who} ${opt.successText}! ${s.myScore}–${s.oppScore}`, true);
        break;
      case 'assist':
        s = { ...s, myScore: s.myScore + 1, assists: s.assists + 1, rating: s.rating + 0.65, momentum: clamp(s.momentum + 25, -100, 100) };
        s = push(s, s.minute, 'goal', 'me', `⚽ GOAL! ${who} ${opt.successText}! ${s.myScore}–${s.oppScore}`, true);
        break;
      case 'save':
        s = { ...s, rating: s.rating + 0.35, momentum: clamp(s.momentum + 12, -100, 100) };
        s = push(s, s.minute, 'clutch', 'me', `🛡️ ${who} ${opt.successText}.`, true);
        break;
      default:
        s = { ...s, rating: s.rating + 0.25, momentum: clamp(s.momentum + 30, -100, 100) };
        s = push(s, s.minute, 'clutch', 'me', `🔥 ${who} ${opt.successText}.`, true);
    }
    return { state: s, success: true };
  }

  // Failure
  s = { ...s, rating: s.rating - 0.2, momentum: clamp(s.momentum - 12, -100, 100) };
  s = push(s, s.minute, 'miss', 'me', `😬 ${who} ${opt.failText}.`, true);
  if (moment.defensive && rng() < 0.55) {
    s = { ...s, oppScore: s.oppScore + 1, rating: s.rating - 0.4, momentum: clamp(s.momentum - 20, -100, 100) };
    s = push(s, s.minute, 'goal', 'opp', `💔 ${ctx.oppName} punish the mistake and score! ${s.myScore}–${s.oppScore}`);
  }
  return { state: s, success: false };
}

/** Called once the 8-zone goal UI has produced a result. */
export function applyKick(m: MatchState, ctx: MatchCtx, kind: KickKind, result: KickResult): MatchState {
  const who = surname(ctx.playerName);
  const label = kind === 'penalty' ? 'penalty' : 'free kick';
  let s: MatchState = { ...m, clutchTotal: m.clutchTotal + 1, nextClutch: m.nextClutch + 1, status: 'playing' };
  s.minute = Math.min(89, s.minute + 1);
  if (result === 'goal') {
    s = { ...s, clutchWins: s.clutchWins + 1, myScore: s.myScore + 1, goals: s.goals + 1, rating: s.rating + 1.1, momentum: clamp(s.momentum + 30, -100, 100) };
    return push(s, s.minute, 'goal', 'me', `⚽ GOAL! ${who} converts the ${label}! ${s.myScore}–${s.oppScore}`, true);
  }
  const text: Record<Exclude<KickResult, 'goal'>, string> = {
    saved: `🧤 SAVED! The keeper denies ${who} from the ${label}.`,
    missed: `😱 ${who} blazes the ${label} wide!`,
    blocked: `🧱 ${who}’s free kick crashes into the wall.`,
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
  };
}
