'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getClub, setClubBoosts, setClubYear } from './data/clubs';
import { challengeCup, continentOf, eliteCup, wonEliteCup } from './data/continental';
import { archiveCurrent } from './archive';
import { squadStatus } from './engine/status';
import { STATUS_LABEL } from './data/status';
import { stripEmoji } from './emoji';
import { getNationality, nationalityByName } from './data/nationalities';
import type { PressAnswer } from './data/press';
import type { Effect } from './data/controversies';
import { BOOST_BY_ID, boostPrice, migrateBoosts } from './data/boosts';
import { celebrationFor, nationKit } from './data/celebrations';
import { emptyTalks, repetition, scaled as scaleNum } from './data/talks';
import { useUiStore } from './ui';
import type { OtherGame } from './engine/livefeed';
import { omissionReason, selectionChance, type SelectionInput } from './engine/selection';
import { fixtureDate } from './dates';
import { galaCost, MAX_UPGRADE_LEVEL, UPGRADES, upgradeCost, type UpgradeId } from './data/shop';
import {
  applyRep,
  ATTR_KEYS,
  ATTR_LABEL,
  calcOvr,
  callUpNeed,
  nationalLevel,
  pointsMoved,
  REBALANCE_MAX,
  REBALANCE_MIN,
  rebalanceCostPerPoint,
  createPlayer,
  fmtMoneyK,
  addPaidLives,
  gainBolts,
  gainMatchXp,
  ovrOf,
  seasonDevelopment,
  seasonLabel,
  spendBolts,
  syncEnergy,
  wageFor,
  type CreateInput,
} from './engine/player';
import { clamp, uid } from './engine/rng';
import { runBallonDor } from './engine/awards';
import { sackChance } from './engine/discipline';
import { AD_REWARD, adsLeft, bumpAds, type AdKind } from './ads';
import { ordinalOf, translate as tr } from './i18n';
import {
  applyDraw,
  applyEuroGroupDraw,
  applyGroupDraw,
  applyFixtureResult,
  baseDivision,
  europeFor,
  generateSeason,
  joinMidSeason,
  leagueZone,
  leaguePosition,
  queueCallUps,
  seasonFinished,
  sitOutFixture,
  sortTable,
  type SeasonCarry,
} from './engine/season';
import {
  approachChance,
  buildOffer,
  counterChance,
  freeAgentOffers,
  generateOffers,
  renewalOffer,
  transferWindow,
} from './engine/transfers';
import type {
  Attributes,
  Division,
  EuroComp,
  AttrKey,
  FixtureResult,
  GamePhase,
  NewsItem,
  Offer,
  Player,
  Reputation,
  SeasonRecord,
  SeasonState,
  SeasonSummary,
} from './types';

export const START_YEAR = 2026;
export const RETIRE_AGE = 38;
export const MAX_TRAININGS_PER_FIXTURE = 2;

interface Result {
  ok: boolean;
  msg: string;
}

interface GameData {
  /** Division the club plays in (changes with promotion / relegation) */
  division: Division;
  /** Continental competition qualified for next season */
  europe: EuroComp | null;
  /** Continental champions: the World Club Cup is next season */
  worldClub: boolean;
  /** The level your clubs have gained (promotion, good seasons) or lost (relegation) on top of their normal strength */
  clubBoost: Record<string, number>;
  hasCareer: boolean;
  phase: GamePhase;
  year: number;
  player: Player | null;
  season: SeasonState | null;
  offers: Offer[];
  offerKey: string;
  approached: string[];
  transferListed: boolean;
  pendingMove: Offer | null;
  /** Sacked mid-season: what the season looked like, so the next club picks it up from there */
  carry?: SeasonCarry | null;
  history: SeasonRecord[];
  lastSummary: SeasonSummary | null;
  news: NewsItem[];
}

interface GameActions {
  createCareer: (input: CreateInput) => void;
  resetCareer: () => void;
  retireNow: () => void;
  /** Spends one bolt; returns false if the player is exhausted. */
  beginMatch: () => boolean;
  /** The player picks a ball in the cup / tournament draw */
  drawFixture: (fixtureId: string, index: number) => void;
  /** The tournament group draw: one ball per pot */
  drawTournamentGroup: (picks: number[]) => void;
  /** The Europe Elite Cup / Europe Challenge Cup group draw */
  drawEuroGroup: (picks: number[]) => void;
  applyStance: (s: { morale: number; rep: Partial<Reputation> }) => void;
  adjust: (morale: number, rep: Partial<Reputation>) => void;
  commitMatch: (result: FixtureResult, others?: OtherGame[]) => void;
  /** Suspended: the team plays the next match without you. `teamStrength` is the level of the side you represent. */
  serveSuspension: (teamStrength: number) => Result;
  applyPress: (a: PressAnswer, info?: { win: boolean; followUp?: boolean; question?: string }) => void;
  /** Remembers what was said in the dressing room so the next talks can react to it. */
  recordTalk: (e: { stance?: string; speech?: string; instruction?: string }) => void;
  /** Apply the outcome of a scandal; returns true when the club terminated the contract. */
  resolveControversy: (e: Effect, title: string) => boolean;
  /** Feed the media with an extra headline (+Media Heat, small fan boost) */
  stirMedia: () => void;
  physio: () => Result;
  buyUpgrade: (id: UpgradeId) => Result;
  buyBoost: (id: string) => Result;
  /** Moves attribute points around (the total stays the same); costs money per point moved */
  rebalanceAttrs: (next: Attributes) => Result;
  /** Uses one boost at the start of a match */
  consumeBoost: (id: string) => void;
  /** Charity gala: once a season, money for goodwill */
  donate: () => Result;
  /** Adds lives after a successful purchase */
  grantLives: (n: number) => void;
  /** Adds a boost to the bag after a real-money purchase */
  grantBoost: (id: string) => Result;
  /** An ad was watched to the end: 3 lives, or the boost `boostId`. Counts against the daily allowance. */
  claimAdReward: (kind: AdKind, boostId?: string) => Result;
  ensureOffers: () => void;
  approach: (clubId: string) => Result;
  requestTransfer: () => Result;
  requestRenewal: () => Result;
  counter: (offerId: string, mult: number) => Result;
  declineOffer: (offerId: string) => void;
  signOffer: (offerId: string) => Result;
  cancelPendingMove: () => void;
  startNextSeason: () => void;
}

export type GameStore = GameData & GameActions;

const initial: GameData = {
  division: 1,
  europe: null,
  worldClub: false,
  clubBoost: {},
  hasCareer: false,
  phase: 'playing',
  year: START_YEAR,
  player: null,
  season: null,
  offers: [],
  offerKey: '',
  approached: [],
  transferListed: false,
  pendingMove: null,
  history: [],
  lastSummary: null,
  news: [],
};

const mkNews = (text: string, tone: NewsItem['tone'] = 'neutral'): NewsItem => ({
  id: uid('news'),
  at: Date.now(),
  tone,
  text: stripEmoji(text),
});

const addNews = (news: NewsItem[], ...items: NewsItem[]) => [...items.reverse(), ...news].slice(0, 14);

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initial,

      createCareer: (input) => {
        // the career you were playing goes to the archive before the new one starts
        archiveCurrent(get());
        setClubBoosts({});
        const player = { ...createPlayer(input, Date.now()), careerId: uid('career') };
        const club = getClub(input.clubId)!;
        const season = generateSeason(START_YEAR, club, Math.random);
        set({
          ...initial,
          hasCareer: true,
          division: baseDivision(club),
          europe: null,
          worldClub: false,
          year: START_YEAR,
          player,
          season,
          news: [mkNews(tr('{name} signs for {club}. The journey begins.', { name: player.name, club: club.name }), 'gold')],
        });
        useUiStore.getState().showSigning({
          kind: 'signed',
          clubId: club.id,
          playerName: player.name,
          position: player.position,
          wage: player.contract?.wage ?? 0,
          years: player.contract?.yearsLeft ?? 3,
          fee: 0,
        });
      },

      resetCareer: () => {
        archiveCurrent(get());
        setClubBoosts({});
        set({ ...initial });
      },

      retireNow: () => {
        const { player, news } = get();
        if (!player) return;
        set({ phase: 'retired', news: addNews(news, mkNews(tr('{name} hangs up the boots.', { name: player.name }), 'gold')) });
        // a finished career is in the hall of fame from the moment it ends
        archiveCurrent(get());
      },

      beginMatch: () => {
        const { player } = get();
        if (!player) return false;
        const e = spendBolts(player.energy, 1, Date.now());
        if (!e) return false;
        set({ player: { ...player, energy: e } });
        return true;
      },

      drawFixture: (fixtureId, index) => {
        const { season } = get();
        if (!season) return;
        set({ season: applyDraw(season, fixtureId, index) });
      },

      drawEuroGroup: (picks) => {
        const { season } = get();
        if (!season) return;
        set({ season: applyEuroGroupDraw(season, picks) });
      },

      drawTournamentGroup: (picks) => {
        const { season } = get();
        if (!season) return;
        set({ season: applyGroupDraw(season, picks) });
      },

      applyStance: (s) => {
        const { player } = get();
        if (!player) return;
        set({
          player: { ...player, morale: clamp(player.morale + s.morale, 0, 100), rep: applyRep(player.rep, s.rep) },
        });
      },

      adjust: (morale, rep) => {
        const { player } = get();
        if (!player) return;
        set({ player: { ...player, morale: clamp(player.morale + morale, 0, 100), rep: applyRep(player.rep, rep) } });
      },

      commitMatch: (result, others) => {
        const { player, season, news } = get();
        if (!player || !season) return;
        const fixture = season.fixtures.find((f) => f.status === 'upcoming');
        if (!fixture) return;

        let nextSeason = applyFixtureResult(season, result, Math.random, others);
        const xp = gainMatchXp(
          player,
          { rating: result.rating, goals: result.goals, assists: result.assists, clutchWins: result.clutchWins ?? 0, fullMatch: !result.subbedOff && !result.benched },
          Math.random,
        );
        const intl = fixture.kind === 'intl' || fixture.kind === 'tournament';
        const contract = player.contract;

        // Reputation & morale consequences
        const repDelta = {
          fanPopularity:
            (result.outcome === 'W' ? 1 : result.outcome === 'L' ? -1 : 0) + Math.min(3, result.goals) + (intl ? 1 : 0),
          coachTrust: result.rating >= 7.5 ? 2 : result.rating < 5.6 ? -2 : result.rating >= 6.8 ? 1 : 0,
          lockerRoom: result.assists > 0 ? 1 : 0,
          mediaHeat: result.goals >= 2 ? 3 : result.goals === 1 ? 1 : intl ? 2 : 0,
        };
        const morale = clamp(
          player.morale + (result.outcome === 'W' ? 6 : result.outcome === 'L' ? -7 : 0) + (result.rating >= 8 ? 3 : 0),
          0,
          100,
        );

        const newTrophies = nextSeason.trophies.slice(season.trophies.length);
        // every trophy won today gets its ceremony (shown once the result has been seen)
        {
          const clubNow = getClub(player.clubId);
          const nat = getNationality(player.nationality);
          for (const trName of newTrophies) {
            const ev = celebrationFor(trName, { club: clubNow?.name ?? tr('Free agent'), kit: clubNow?.color ?? '#10b981', nation: tr(nat.name), nationKit: nationKit(nat.code), clubShort: clubNow?.short, clubCountryCode: nationalityByName(clubNow?.country ?? '')?.code, nationCode: nat.code, nationFlag: nat.flag });
            if (ev) useUiStore.getState().queueCelebration(ev);
          }
        }
        const updated: Player = {
          ...player,
          attrs: xp.attrs,
          xp: xp.xp,
          form: [...player.form, result.rating].slice(-5),
          // a red card costs the next matches; playing a match means any earlier ban was waived or served
          suspension: result.ban ? { matches: result.ban, scope: intl ? ('nation' as const) : ('club' as const) } : undefined,
          morale: clamp(morale + (result.sentOff ? -9 : result.subbedOff ? -4 : 0), 0, 100),
          rep: applyRep(
            player.rep,
            result.sentOff
              ? { ...repDelta, coachTrust: repDelta.coachTrust - 5, lockerRoom: repDelta.lockerRoom - 3, fanPopularity: repDelta.fanPopularity - 2, mediaHeat: repDelta.mediaHeat + 3 }
              : result.subbedOff
                ? { ...repDelta, coachTrust: repDelta.coachTrust - 2, lockerRoom: repDelta.lockerRoom - 1 }
                : repDelta,
          ),
          national: intl
            ? fixture.level
              ? { caps: player.national?.caps ?? 0, goals: player.national?.goals ?? 0, youthCaps: (player.national?.youthCaps ?? 0) + 1 }
              : { caps: (player.national?.caps ?? 0) + 1, goals: (player.national?.goals ?? 0) + result.goals, youthCaps: player.national?.youthCaps }
            : player.national,
          money: player.money + (contract ? contract.wage * 2 + (result.outcome === 'W' ? contract.wage * 0.5 : 0) : 0),
          trophies: [...player.trophies, ...newTrophies],
          totals: {
            ...player.totals,
            apps: player.totals.apps + 1,
            goals: player.totals.goals + result.goals,
            assists: player.totals.assists + result.assists,
          },
        };
        const newOvr = ovrOf(updated);
        updated.peakOvr = Math.max(updated.peakOvr, newOvr);

        let nextNews = news;
        if (xp.gained.length > 0) {
          nextNews = addNews(nextNews, mkNews(tr('Attribute boost: +{n} after a {r} rating.', { n: xp.gained.length, r: result.rating.toFixed(1) }), 'good'));
        }
        if (result.sentOff) {
          nextNews = addNews(nextNews, mkNews(tr('🟥 You were sent off — the dressing room is not happy.'), 'bad'));
          if (result.ban) nextNews = addNews(nextNews, mkNews(tr('🟥 Suspended for {n} match(es) after the red card.', { n: result.ban }), 'bad'));
        }
        else if (result.subbedOff) nextNews = addNews(nextNews, mkNews(tr('The coach hauled you off early after a poor display.'), 'bad'));
        for (const t of newTrophies) nextNews = addNews(nextNews, mkNews(tr('🏆 {t} — silverware!', { t: tr(t) }), 'gold'));
        const rank = { U20: 1, U23: 2, A: 3 } as const;
        const natStr = getNationality(player.nationality).strength;
        const lvlBefore = nationalLevel(ovrOf(player), player.age, natStr);
        const lvlNow = nationalLevel(newOvr, player.age, natStr);
        // the national coach starts watching you when you reach what a regular pick of that side is
        const wasThere = ovrOf(player) >= callUpNeed(lvlBefore, natStr);
        if (newOvr >= callUpNeed(lvlNow, natStr) && !wasThere) {
          nextNews = addNews(
            nextNews,
            mkNews(lvlNow === 'A' ? tr('📣 OVR {n}! The national team is watching you.', { n: newOvr }) : tr('📣 OVR {n}! The {level} national team is watching you.', { n: newOvr, level: lvlNow }), 'gold'),
          );
        }
        if (fixture.kind === 'cup' && result.outcome === 'L') {
          nextNews = addNews(nextNews, mkNews(tr('Knocked out of the cup by {opp}.', { opp: fixture.opponent }), 'bad'));
        }

        // The national coach decides: being good enough is not enough, he also watches your form
        const omitted: { input?: SelectionInput; hopeless?: boolean } = {};
        const decide = (stage: 'window' | 'tournament') => {
          const input: SelectionInput = {
            level: lvlNow,
            stage,
            ovr: newOvr,
            natStrength: natStr,
            form: updated.form,
            contributions: nextSeason.stats.goals + nextSeason.stats.assists,
            apps: nextSeason.stats.apps,
            omittedBefore: !!nextSeason.callUpOmitted,
          };
          const chance = selectionChance(input);
          const ok = Math.random() < chance;
          if (!ok) {
            omitted.input = input;
            // nowhere near the squad: not worth a headline
            if (chance < 0.12) omitted.hopeless = true;
          }
          return ok;
        };
        const teamName = `${tr(getNationality(player.nationality).name)}${lvlNow && lvlNow !== 'A' ? ' ' + lvlNow : ''}`;
        nextSeason = queueCallUps(nextSeason, newOvr, getNationality(player.nationality), Math.random, player.age, decide);
        const ui = useUiStore.getState();
        if (nextSeason.callUpQueued && !season.callUpQueued && lvlNow) {
          if (nextSeason.callUpOmitted && !season.callUpOmitted) {
            const reason = omitted.input ? omissionReason(omitted.input) : 'unlucky';
            if (!omitted.hopeless) {
              nextNews = addNews(nextNews, mkNews(tr('The {team} coach left you out of the squad.', { team: teamName }), 'bad'));
              ui.pushCallUp({ outcome: 'omitted', level: lvlNow, nationCode: player.nationality, matches: [], reason });
            }
          } else {
            const games = nextSeason.fixtures.map((f, i) => ({ f, i })).filter(({ f }) => f.kind === 'intl' && f.status === 'upcoming');
            // Olympic qualifiers are played by the under-23 side, with up to three older players
            const olympicQ = games.some(({ f }) => /^Summer Games Qualifier/.test(f.label));
            const squad = olympicQ ? 'U23' : lvlNow;
            const squadName = `${tr(getNationality(player.nationality).name)}${squad !== 'A' ? ' ' + squad : ''}`;
            nextNews = addNews(nextNews, mkNews(tr('🌍 Call-up! You’re named in the {team} squad.', { team: squadName }), 'gold'));
            if (games.length) ui.pushCallUp({ outcome: 'called', level: squad, nationCode: player.nationality, competition: olympicQ ? 'Summer Games Qualifier' : undefined, overage: olympicQ && player.age > 23, matches: games.map(({ f, i }) => ({ label: f.label, opponent: f.opponent, date: fixtureDate(nextSeason, i).toISOString() })) });
          }
        }
        if (nextSeason.tournamentQueued && !season.tournamentQueued && lvlNow) {
          // the Olympics are an under-23 tournament, whatever your usual level; older players come as one of the three overage picks
          const olympic = nextSeason.tournamentName === 'Summer Games';
          const tLevel = olympic ? 'U23' : lvlNow;
          const overage = olympic && player.age > 23;
          const tTeam = `${tr(getNationality(player.nationality).name)}${tLevel !== 'A' ? ' ' + tLevel : ''}`;
          if (nextSeason.tournamentFailed) {
            nextNews = addNews(nextNews, mkNews(tr('{team} failed to qualify for the {name}.', { team: tTeam, name: tr(nextSeason.tournamentName ?? '') }), 'bad'));
          } else if (nextSeason.tournamentOmitted) {
            const reason = omitted.input ? omissionReason(omitted.input) : 'unlucky';
            if (!omitted.hopeless) nextNews = addNews(nextNews, mkNews(tr('You miss the {name}: the coach left you out.', { name: tr(nextSeason.tournamentName ?? '') }), 'bad'));
            if (!omitted.hopeless) ui.pushCallUp({ outcome: 'omitted', level: tLevel, nationCode: player.nationality, competition: nextSeason.tournamentName ?? undefined, matches: [], reason, overage });
          } else {
            nextNews = addNews(nextNews, mkNews(tr(overage ? '🌍 You’re heading to the {name} as one of the three overage players!' : '🌍 You’re heading to the {name}!', { name: tr(nextSeason.tournamentName ?? '') }), 'gold'));
            const stages = nextSeason.fixtures.map((x, i) => ({ x, i })).filter(({ x }) => x.kind === 'tournament' && x.status === 'upcoming');
            ui.pushCallUp({
              outcome: 'called',
              level: tLevel,
              nationCode: player.nationality,
              competition: nextSeason.tournamentName ?? undefined,
              overage,
              matches: stages.map(({ x, i }) => ({ label: x.label, opponent: x.drawn === false ? '' : x.opponent, date: fixtureDate(nextSeason, i).toISOString() })),
            });
          }
        }

        set({ player: updated, season: nextSeason, news: nextNews });

        if (seasonFinished(nextSeason)) finishSeason(set, get);
      },

      serveSuspension: (teamStrength) => {
        const { player, season, news } = get();
        if (!player || !season || !player.suspension) return { ok: false, msg: tr('No active career.') };
        const upcoming = season.fixtures.filter((f) => f.status === 'upcoming');
        const fixture = upcoming[0];
        // the last match of the season is never missed: the ban is waived rather than leave the season unfinished
        if (!fixture || fixture.drawn === false || upcoming.length <= 1) {
          set({ player: { ...player, suspension: undefined } });
          return { ok: false, msg: '' };
        }
        const out = sitOutFixture(season, teamStrength, Math.random);
        if (!out) return { ok: false, msg: '' };
        const left = player.suspension.matches - 1;
        const national = fixture.kind === 'intl' || fixture.kind === 'tournament';
        const msg = tr('Suspended — you watched from the stands: {me} {a}–{b} {opp}.', { me: national ? tr(getNationality(player.nationality).name) : (getClub(player.clubId)?.name ?? ''), a: out.result.myScore, b: out.result.oppScore, opp: tr(fixture.opponent) });
        set({
          season: out.season,
          player: { ...player, suspension: left > 0 ? { ...player.suspension, matches: left } : undefined },
          news: addNews(news, mkNews(msg, 'neutral')),
        });
        return { ok: true, msg };
      },

      applyPress: (a, info) => {
        const { player } = get();
        if (!player) return;
        const talks = player.talks ?? emptyTalks();
        // saying the same kind of thing every week loses its punch
        const rpt = info?.followUp ? { count: 0, factor: 1 } : repetition(talks.press, a.style);
        // High media heat amplifies every answer (good or bad).
        const amp = 1 + player.rep.mediaHeat / 150;
        const rep = Object.fromEntries(Object.entries(a.rep).map(([k, v]) => [k, scaleNum(Math.round((v as number) * amp), rpt.factor)]));
        // how the press feels about you drifts with what you say
        const swing =
          a.style === 'humble' ? 6 : a.style === 'tactical' ? 3 : a.style === 'deflect' ? 2 : a.style === 'bold' ? (info?.win ? 4 : -5) : -7;
        const mood = clamp(Math.round(talks.mood * 0.92 + swing * (info?.followUp ? 0.5 : 1) - (rpt.count >= 2 ? 2 : 0)), -100, 100);
        set({
          player: {
            ...player,
            morale: clamp(player.morale + scaleNum(a.morale, rpt.factor), 0, 100),
            rep: applyRep(player.rep, rep),
            talks: {
              ...talks,
              mood,
              press: info?.followUp ? talks.press : [...talks.press, a.style].slice(-10),
              questions: info?.question ? [...talks.questions, info.question].slice(-8) : talks.questions,
            },
          },
        });
      },

      recordTalk: (e) => {
        const { player } = get();
        if (!player) return;
        const talks = player.talks ?? emptyTalks();
        set({
          player: {
            ...player,
            talks: {
              ...talks,
              stances: e.stance ? [...talks.stances, e.stance].slice(-10) : talks.stances,
              speeches: e.speech ? [...talks.speeches, e.speech].slice(-8) : talks.speeches,
              instructions: e.instruction ? [...talks.instructions, e.instruction].slice(-8) : talks.instructions,
            },
          },
        });
      },

      resolveControversy: (e, title) => {
        const { player, news, year, phase } = get();
        if (!player) return false;
        const strikes = clamp((player.strikes ?? 0) + e.strike, 0, 3);
        const fine = e.fine ? Math.round((player.contract?.wage ?? 4) * e.fine) : 0;
        let p: Player = {
          ...player,
          morale: clamp(player.morale + e.morale, 0, 100),
          rep: applyRep(player.rep, e.rep),
          money: Math.max(0, player.money - fine),
          strikes,
        };
        let nextNews = news;
        if (fine) nextNews = addNews(nextNews, mkNews(tr('The club fines you {fine} for the {title} affair.', { fine: fmtMoneyK(fine), title: tr(title) }), 'bad'));
        if (strikes >= 3) {
          const club = getClub(p.clubId);
          const { season } = get();
          // the club only walks away if you are not delivering: a player who is playing well gets a last warning instead
          const sack = phase === 'season-end' || Math.random() < sackChance({ form: p.form, coachTrust: p.rep.coachTrust, ovr: ovrOf(p), clubStrength: club?.strength ?? 60, stats: season?.stats });
          if (!sack) {
            p = { ...p, strikes: 2, rep: applyRep(p.rep, { coachTrust: -4, lockerRoom: -2 }) };
            set({ player: p, news: addNews(nextNews, mkNews(tr('{club} stand by you: your performances earn you a last warning.', { club: club?.name ?? '' }), 'gold')) });
            return false;
          }
          p = { ...p, strikes: 0, rep: applyRep(p.rep, { coachTrust: -15, fanPopularity: -6, lockerRoom: -6 }) };
          if (phase === 'season-end') {
            // the season is already over: simply make sure the contract is not renewed
            p = { ...p, rep: applyRep(p.rep, { coachTrust: 20 - p.rep.coachTrust }), contract: p.contract ? { ...p.contract, yearsLeft: 0 } : null };
            set({ player: p, news: addNews(nextNews, mkNews(tr('{club} will not renew your contract after repeated scandals.', { club: club?.name ?? '' }), 'bad')) });
          } else {
            p = { ...p, clubId: null, contract: null };
            set({
              player: p,
              // the season goes on without you: the next club picks it up from where you were
              carry: season ? { leaguePlayed: season.fixtures.filter((f) => f.kind === 'league' && f.status === 'played').length, stats: season.stats, trophies: season.trophies } : null,
              season: null,
              phase: 'free-agent',
              offers: freeAgentOffers(p, Math.random),
              offerKey: `${year}-summer`,
              approached: [],
              transferListed: false,
              pendingMove: null,
              news: addNews(nextNews, mkNews(tr('{club} terminate your contract after repeated scandals.', { club: club?.name ?? '' }), 'bad')),
            });
          }
          return true;
        }
        set({ player: p, news: nextNews });
        return false;
      },

      stirMedia: () => {
        const { player } = get();
        if (!player) return;
        set({ player: { ...player, rep: applyRep(player.rep, { mediaHeat: 6, fanPopularity: 2, coachTrust: -1 }) } });
      },

      physio: () => {
        const { player } = get();
        if (!player || !player.contract) return { ok: false, msg: tr('No active career.') };
        const now = Date.now();
        const e = syncEnergy(player.energy, now);
        if (e.bolts >= 5) return { ok: false, msg: tr('You’re already fully charged.') };
        const cost = player.contract.wage * 3;
        if (player.money < cost) return { ok: false, msg: tr('You need {cost} for the recovery clinic.', { cost: fmtMoneyK(cost) }) };
        set({ player: { ...player, money: player.money - cost, energy: gainBolts(e, 2, now) } });
        return { ok: true, msg: tr('Recovery clinic: +2 lives (−{cost}).', { cost: fmtMoneyK(cost) }) };
      },

      buyUpgrade: (id) => {
        const { player } = get();
        const def = UPGRADES.find((u) => u.id === id);
        if (!player || !def) return { ok: false, msg: tr('No active career.') };
        const level = player.upgrades?.[id] ?? 0;
        const cost = upgradeCost(def, level, player.contract?.wage ?? 4);
        if (cost === null || level >= MAX_UPGRADE_LEVEL) return { ok: false, msg: tr('Already at the maximum level.') };
        if (player.money < cost) return { ok: false, msg: tr('You need {cost} for this upgrade.', { cost: fmtMoneyK(cost) }) };
        const upgrades = { coach: 0, pr: 0, agent: 0, nutrition: 0, ...player.upgrades, [id]: level + 1 };
        set({ player: { ...player, money: player.money - cost, upgrades } });
        return { ok: true, msg: tr('{name} upgraded to level {n}!', { name: tr(def.name), n: level + 1 }) };
      },

      rebalanceAttrs: (next) => {
        const { player } = get();
        if (!player) return { ok: false, msg: tr('No active career.') };
        const sum = (a: Attributes) => ATTR_KEYS.reduce((s, k) => s + a[k], 0);
        if (sum(next) !== sum(player.attrs)) return { ok: false, msg: tr('Every point you take must go somewhere else.') };
        if (ATTR_KEYS.some((k) => next[k] < REBALANCE_MIN || next[k] > REBALANCE_MAX)) return { ok: false, msg: tr('Attributes stay between {a} and {b}.', { a: REBALANCE_MIN, b: REBALANCE_MAX }) };
        const moved = pointsMoved(player.attrs, next);
        if (moved === 0) return { ok: false, msg: tr('Nothing to change.') };
        const cost = moved * rebalanceCostPerPoint(player.contract?.wage ?? 4);
        if (player.money < cost) return { ok: false, msg: tr('You need {cost} to retrain.', { cost: fmtMoneyK(cost) }) };
        // an attribute you take points from starts again from zero progress
        const xp = { ...player.xp };
        for (const k of ATTR_KEYS) if (next[k] < player.attrs[k]) xp[k] = 0;
        set({ player: { ...player, attrs: next, xp, money: player.money - cost, peakOvr: Math.max(player.peakOvr, calcOvr(next, player.position, xp)) } });
        return { ok: true, msg: tr('Retraining done: {n} points moved.', { n: moved }) };
      },

      buyBoost: (id) => {
        const { player } = get();
        const def = BOOST_BY_ID[id];
        if (!player || !def) return { ok: false, msg: tr('No active career.') };
        const cost = boostPrice(def, player.contract?.wage ?? 4);
        if (player.money < cost) return { ok: false, msg: tr('You need {cost} for this boost.', { cost: fmtMoneyK(cost) }) };
        const have = player.boosts?.[id] ?? 0;
        if (have >= 9) return { ok: false, msg: tr('You can only carry 9 of each boost.') };
        set({ player: { ...player, money: player.money - cost, boosts: { ...player.boosts, [id]: have + 1 } } });
        return { ok: true, msg: tr('{name} added to your bag.', { name: tr(def.name) }) };
      },

      consumeBoost: (id) => {
        const { player } = get();
        if (!player || !(player.boosts?.[id] ?? 0)) return;
        set({ player: { ...player, boosts: { ...player.boosts, [id]: (player.boosts?.[id] ?? 1) - 1 } } });
      },

      donate: () => {
        const { player, year, news } = get();
        if (!player) return { ok: false, msg: tr('No active career.') };
        if (player.donatedYear === year) return { ok: false, msg: tr('You already hosted a gala this season.') };
        const cost = galaCost(player.contract?.wage ?? 4);
        if (player.money < cost) return { ok: false, msg: tr('You need {cost} for the gala.', { cost: fmtMoneyK(cost) }) };
        set({
          player: { ...player, money: player.money - cost, donatedYear: year, rep: applyRep(player.rep, { fanPopularity: 5, lockerRoom: 2, mediaHeat: 3, coachTrust: 1 }) },
          news: addNews(news, mkNews(tr('Your charity gala wins hearts across the city.'), 'good')),
        });
        return { ok: true, msg: tr('The gala was a success: fans and media love it.') };
      },

      grantLives: (n) => {
        const { player } = get();
        if (!player) return;
        set({ player: { ...player, energy: addPaidLives(player.energy, n, Date.now()) } });
      },

      grantBoost: (id) => {
        const { player } = get();
        const def = BOOST_BY_ID[id];
        if (!player || !def) return { ok: false, msg: tr('No active career.') };
        const have = player.boosts?.[id] ?? 0;
        if (have >= 9) return { ok: false, msg: tr('You can only carry 9 of each boost.') };
        set({ player: { ...player, boosts: { ...player.boosts, [id]: have + 1 } } });
        return { ok: true, msg: tr('{name} added to your bag.', { name: tr(def.name) }) };
      },

      claimAdReward: (kind, boostId) => {
        const { player } = get();
        if (!player) return { ok: false, msg: tr('No active career.') };
        if (adsLeft(player.adsToday, kind) <= 0) return { ok: false, msg: tr('No more ads for today: come back tomorrow.') };
        if (kind === 'lives') {
          set({ player: { ...player, energy: addPaidLives(player.energy, AD_REWARD.lives, Date.now()), adsToday: bumpAds(player.adsToday, 'lives') } });
          return { ok: true, msg: tr('+{n} lives added!', { n: AD_REWARD.lives }) };
        }
        const def = boostId ? BOOST_BY_ID[boostId] : undefined;
        if (!def || !boostId) return { ok: false, msg: tr('No active career.') };
        const have = player.boosts?.[boostId] ?? 0;
        if (have >= 9) return { ok: false, msg: tr('You can only carry 9 of each boost.') };
        set({ player: { ...player, boosts: { ...player.boosts, [boostId]: have + 1 }, adsToday: bumpAds(player.adsToday, 'boost') } });
        return { ok: true, msg: tr('{name} added to your bag.', { name: tr(def.name) }) };
      },

      ensureOffers: () => {
        const { player, season, phase, year, offerKey } = get();
        if (!player) return;
        const win = transferWindow(season, phase, year);
        if (!win.open || win.key === offerKey) return;
        const list = generateOffers(player, false, Math.random);
        const renew = (phase === 'season-end' || player.contract?.yearsLeft === 1) ? renewalOffer(player, Math.random) : null;
        set({
          offers: renew ? [renew, ...list] : list,
          offerKey: win.key,
          approached: [],
          transferListed: false,
        });
      },

      approach: (clubId) => {
        const { player, season, phase, year, approached, offers, news } = get();
        const club = getClub(clubId);
        if (!player || !club) return { ok: false, msg: tr('Unknown club.') };
        const win = transferWindow(season, phase, year);
        if (!win.open) return { ok: false, msg: tr('The transfer window is closed.') };
        if (approached.includes(clubId)) return { ok: false, msg: tr('Your agent already tried this window.') };
        const success = Math.random() < approachChance(player, club);
        const base = {
          approached: [...approached, clubId],
          player: { ...player, rep: applyRep(player.rep, { mediaHeat: 2 }) },
        };
        if (!success) {
          set({ ...base, news: addNews(news, mkNews(tr('{club} turned down your agent’s approach.', { club: club.name }), 'bad')) });
          return { ok: false, msg: tr('{club} aren’t interested right now.', { club: club.name }) };
        }
        const offer = buildOffer(player, club, 'approach', Math.random);
        set({ ...base, offers: [offer, ...offers], news: addNews(news, mkNews(tr('{club} table an offer after your agent’s call.', { club: club.name }), 'good')) });
        return { ok: true, msg: tr('{club} have made you an offer!', { club: club.name }) };
      },

      requestTransfer: () => {
        const { player, season, phase, year, transferListed, offers } = get();
        if (!player) return { ok: false, msg: tr('No active career.') };
        const win = transferWindow(season, phase, year);
        if (!win.open) return { ok: false, msg: tr('The transfer window is closed.') };
        if (transferListed) return { ok: false, msg: tr('You’re already on the transfer list.') };
        const extra = generateOffers(player, true, Math.random).filter((o) => !offers.some((x) => x.clubId === o.clubId));
        set({
          transferListed: true,
          offers: [...offers, ...extra],
          player: { ...player, rep: applyRep(player.rep, { coachTrust: -6, lockerRoom: -3, fanPopularity: -2, mediaHeat: 4 }) },
        });
        return { ok: true, msg: tr(extra.length === 1 ? 'Transfer request filed. {n} new club enquired.' : 'Transfer request filed. {n} new clubs enquired.', { n: extra.length }) };
      },

      requestRenewal: () => {
        const { player, offers } = get();
        if (!player) return { ok: false, msg: tr('No active career.') };
        if (offers.some((o) => o.source === 'renewal')) return { ok: false, msg: tr('A renewal offer is already on the table.') };
        const offer = renewalOffer(player, Math.random);
        if (!offer) return { ok: false, msg: tr('The manager isn’t convinced — build Coach Trust to 40+ first.') };
        set({ offers: [offer, ...offers] });
        return { ok: true, msg: tr('The club tabled a new contract.') };
      },

      counter: (offerId, mult) => {
        const { player, offers, news } = get();
        const offer = offers.find((o) => o.id === offerId);
        if (!player || !offer) return { ok: false, msg: tr('Offer not found.') };
        if (offer.countered) return { ok: false, msg: tr('You’ve already countered this offer.') };
        const club = getClub(offer.clubId);
        if (Math.random() < counterChance(player, mult)) {
          set({ offers: offers.map((o) => (o.id === offerId ? { ...o, wage: Math.round(o.wage * mult), countered: true } : o)) });
          return { ok: true, msg: tr('{club} accepted your counter-offer!', { club: club?.name ?? '' }) };
        }
        set({
          offers: offers.filter((o) => o.id !== offerId),
          news: addNews(news, mkNews(tr('{club} withdrew their offer after your wage demand.', { club: club?.name ?? '' }), 'bad')),
        });
        return { ok: false, msg: tr('{club} walked away from the table.', { club: club?.name ?? '' }) };
      },

      declineOffer: (offerId) => set({ offers: get().offers.filter((o) => o.id !== offerId) }),

      signOffer: (offerId) => {
        const { player, season, phase, year, offers, news } = get();
        const offer = offers.find((o) => o.id === offerId);
        const club = offer ? getClub(offer.clubId) : undefined;
        if (!player || !offer || !club) return { ok: false, msg: tr('Offer not found.') };
        const win = transferWindow(season, phase, year);
        if (!win.open) return { ok: false, msg: tr('The transfer window is closed.') };

        if (!win.immediate) {
          set({
            pendingMove: offer,
            news: addNews(news, mkNews(tr(offer.source === 'renewal' ? 'Agreed: new deal at {club} next season.' : 'Agreed: joining {club} next season.', { club: club.name }), 'gold')),
          });
          // After the season, the summer window ends the story: sign, watch the ceremony, and the new season starts
          if (phase === 'season-end') {
            if (offer.source === 'renewal') {
              useUiStore.getState().showSigning({ kind: 'renewal', clubId: club.id, playerName: player.name, position: player.position, wage: offer.wage, years: offer.years, fee: offer.fee, goHome: true });
            }
            // a transfer shows its own ceremony as the new season begins
            get().startNextSeason();
            return { ok: true, msg: tr(offer.source === 'renewal' ? 'Contract signed with {club}.' : 'Welcome to {club}!', { club: club.name }) };
          }
          useUiStore.getState().showSigning({
            kind: offer.source === 'renewal' ? 'renewal' : 'agreed',
            clubId: club.id,
            playerName: player.name,
            position: player.position,
            wage: offer.wage,
            years: offer.years,
            fee: offer.fee,
          });
          return { ok: true, msg: tr('Deal agreed — it takes effect next season.') };
        }

        const moved = applyMove(player, offer);
        // sacked mid-season: the new club's season is already under way, and it picks up from where you were
        const carry = phase === 'free-agent' && offer.source !== 'renewal' ? get().carry : null;
        const midway = !!carry && carry.leaguePlayed > 0;
        // a new club comes with its own record: it may have qualified for Europe last season (not when joining half-way through)
        const arrivalEurope = offer.source === 'renewal' || midway ? null : europeFor(club, Math.random);
        const fresh = offer.source === 'renewal' ? season : generateSeason(year, club, Math.random, { europe: arrivalEurope });
        const keepSeason = fresh && carry ? joinMidSeason(fresh, carry, Math.random) : fresh;
        set({
          player: moved,
          season: keepSeason,
          ...(offer.source === 'renewal' ? {} : { division: baseDivision(club), europe: arrivalEurope, worldClub: false }),
          phase: 'playing',
          offers: [],
          pendingMove: null,
          carry: null,
          news: addNews(news, mkNews(tr(offer.source === 'renewal' ? 'Contract signed with {club}.' : '🖊️ Signed for {club}!', { club: club.name }), 'gold'), ...(arrivalEurope ? [mkNews(tr('🌍 {club} qualified for the {comp} last season: continental nights ahead!', { club: club.name, comp: tr(arrivalEurope) }), 'good')] : [])),
        });
        useUiStore.getState().showSigning({
          kind: offer.source === 'renewal' ? 'renewal' : 'signed',
          clubId: club.id,
          playerName: player.name,
          position: player.position,
          wage: offer.wage,
          years: offer.years,
          fee: offer.fee,
        });
        return { ok: true, msg: tr('Welcome to {club}!', { club: club.name }) };
      },

      cancelPendingMove: () => set({ pendingMove: null }),

      startNextSeason: () => {
        const { player, year, pendingMove, news } = get();
        if (!player) return;
        if (player.age >= RETIRE_AGE) {
          set({ phase: 'retired', news: addNews(news, mkNews(tr('{name} retires at {age}.', { name: player.name, age: player.age }), 'gold')) });
          archiveCurrent(get());
          return;
        }
        const nextYear = year + 1;
        let p = player;
        let nextNews = news;

        if (pendingMove) {
          p = applyMove(p, pendingMove);
          if (pendingMove.source !== 'renewal') {
            // the pre-agreed move becomes official: time for the welcome ceremony
            useUiStore.getState().showSigning({
              kind: 'signed',
              clubId: pendingMove.clubId,
              playerName: p.name,
              position: p.position,
              wage: pendingMove.wage,
              years: pendingMove.years,
              fee: pendingMove.fee,
              goHome: true,
            });
          }
        } else if (p.contract && p.contract.yearsLeft <= 0) {
          const club = getClub(p.clubId);
          if (club && p.rep.coachTrust >= 35) {
            const wage = Math.round(wageFor(ovrOf(p), p.age, club.tier) * 1.05);
            p = { ...p, contract: { wage, yearsLeft: 2 } };
            nextNews = addNews(nextNews, mkNews(tr('{club} extend your deal by two years.', { club: club.name }), 'good'));
          } else {
            p = { ...p, clubId: null, contract: null };
            nextNews = addNews(nextNews, mkNews(tr('Your contract expired and was not renewed. You’re a free agent.'), 'bad'));
          }
        }

        const club = getClub(p.clubId);
        if (!club) {
          set({
            year: nextYear,
            player: p,
            season: null,
            phase: 'free-agent',
            offers: freeAgentOffers(p, Math.random),
            offerKey: `${nextYear}-summer`,
            approached: [],
            transferListed: false,
            pendingMove: null,
            carry: null,
            news: nextNews,
          });
          return;
        }
        // a new club comes with its own record: it may have qualified for Europe last season
        const newClub = !!pendingMove && pendingMove.source !== 'renewal';
        const arrivalEurope = newClub ? europeFor(club, Math.random) : null;
        if (arrivalEurope) nextNews = addNews(nextNews, mkNews(tr('🌍 {club} qualified for the {comp} last season: continental nights ahead!', { club: club.name, comp: tr(arrivalEurope) }), 'good'));
        set({
          year: nextYear,
          player: p,
          // a new club starts in its own division; otherwise the promotion / relegation / European place earned carries over
          season: generateSeason(nextYear, club, Math.random, newClub ? { europe: arrivalEurope } : { division: get().division, europe: get().europe, worldClub: get().worldClub }),
          ...(newClub ? { division: baseDivision(club), europe: arrivalEurope, worldClub: false } : {}),
          phase: 'playing',
          pendingMove: null,
          carry: null,
          lastSummary: null,
          news: addNews(nextNews, mkNews(tr('Season {s} begins at {club}.', { s: seasonLabel(nextYear), club: club.name }), 'neutral')),
        });
      },
    }),
    {
      name: 'fcs-save-v1',
      version: 2,
      // v2: the four match-day boosts replace the first four
      migrate: (persisted, version) => {
        const s = persisted as GameStore;
        if (version < 2 && s?.player?.boosts) return { ...s, player: { ...s.player, boosts: migrateBoosts(s.player.boosts) } };
        return s;
      },
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : window.localStorage) as Storage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        setClubBoosts(state?.clubBoost ?? {});
        if (state?.season?.year) setClubYear(state.season.year);
        // a career that ended before the archive existed is filed the first time the save loads
        if (state?.phase === 'retired') archiveCurrent(state);
      },
    },
  ),
);

/* ───────── Helpers ───────── */

type Setter = (partial: Partial<GameStore>) => void;
type Getter = () => GameStore;

/** Move a player to a new club / sign a renewal. */
function applyMove(player: Player, offer: Offer): Player {
  if (offer.source === 'renewal') {
    return { ...player, contract: { wage: offer.wage, yearsLeft: offer.years } };
  }
  return {
    ...player,
    clubId: offer.clubId,
    contract: { wage: offer.wage, yearsLeft: offer.years },
    money: player.money + offer.wage * 6,
    // A fresh dressing room: trust has to be rebuilt, but your profile travels with you
    rep: applyRep(player.rep, {
      coachTrust: 45 - player.rep.coachTrust,
      lockerRoom: 40 - player.rep.lockerRoom,
      fanPopularity: Math.round((35 - player.rep.fanPopularity) * 0.5),
      mediaHeat: 6,
    }),
    totals: { ...player.totals, transfers: player.totals.transfers + 1 },
  };
}

function finishSeason(set: Setter, get: Getter) {
  const { player, season, history, news } = get();
  if (!player || !season) return;

  const table = sortTable(season.table);
  const pos = leaguePosition(season);
  const trophies = [...season.trophies];
  let p: Player = player;
  let nextNews = news;
  if (pos === 1) {
    const t = `League Title ${seasonLabel(season.year)}`;
    trophies.push(t);
    {
      const c = getClub(player.clubId);
      const ev = celebrationFor(t, { club: c?.name ?? '', kit: c?.color ?? '#10b981', nation: '', clubShort: c?.short, clubCountryCode: nationalityByName(c?.country ?? '')?.code });
      if (ev) useUiStore.getState().queueCelebration(ev);
    }
    p = { ...p, trophies: [...p.trophies, t] };
    nextNews = addNews(nextNews, mkNews(tr('🏆 {t} — champions!', { t: tr(t) }), 'gold'));
  }

  const avg = season.stats.apps ? season.stats.ratingSum / season.stats.apps : 0;
  const ovrBefore = ovrOf(p);
  const dev = seasonDevelopment(p, avg, Math.random);
  const aged = p.age + 1;
  p = {
    ...p,
    attrs: dev.attrs,
    age: aged,
    contract: p.contract ? { ...p.contract, yearsLeft: p.contract.yearsLeft - 1 } : null,
    rep: applyRep(p.rep, pos <= 3 ? { fanPopularity: 4, coachTrust: 2 } : pos >= 9 ? { fanPopularity: -3, coachTrust: -2 } : {}),
    morale: clamp(p.morale + (pos <= 3 ? 8 : pos >= 9 ? -6 : 0), 0, 100),
    strikes: Math.max(0, (p.strikes ?? 0) - 1),
  };
  const ovrAfter = ovrOf(p);
  p.peakOvr = Math.max(p.peakOvr, ovrAfter);

  const record: SeasonRecord = {
    year: season.year,
    clubId: p.clubId ?? '',
    age: player.age,
    ovr: ovrAfter,
    apps: season.stats.apps,
    goals: season.stats.goals,
    assists: season.stats.assists,
    avgRating: Math.round(avg * 10) / 10,
    leaguePos: pos,
    trophies,
  };

  // Golden Star: the player's season is ranked against nine invented superstars
  const clubNow = getClub(p.clubId);
  const award = runBallonDor(
    {
      ovr: ovrBefore,
      goals: season.stats.goals,
      assists: season.stats.assists,
      avgRating: avg,
      trophies,
      fanPopularity: p.rep.fanPopularity,
      mediaHeat: p.rep.mediaHeat,
      clubName: clubNow?.name ?? '—',
      playerName: p.name,
    },
    Math.random,
  );
  if (award?.won) {
    const t = `Golden Star ${seasonLabel(season.year)}`;
    {
      const ev = celebrationFor(t, { club: clubNow?.name ?? '', kit: clubNow?.color ?? '#10b981', nation: '', clubShort: clubNow?.short, clubCountryCode: nationalityByName(clubNow?.country ?? '')?.code });
      if (ev) useUiStore.getState().queueCelebration(ev);
    }
    p = { ...p, trophies: [...p.trophies, t], rep: applyRep(p.rep, { fanPopularity: 8, mediaHeat: 6, lockerRoom: 2 }) };
    nextNews = addNews(nextNews, mkNews(tr('🏆 {t} — you are the best player in the world!', { t: tr(t) }), 'gold'));
  } else if (award) {
    nextNews = addNews(nextNews, mkNews(tr('Golden Star: you finish {rank} in the vote.', { rank: ordinalOf(award.rank) }), 'neutral'));
  }

  // Where the league finish leads: Europe, promotion or relegation
  const divNow: Division = season.division ?? 1;
  const zone = leagueZone(pos, divNow, season.table.length);
  const nextDivision: Division = zone === 'promoted' ? ((divNow - 1) as Division) : zone === 'relegated' ? ((divNow + 1) as Division) : divNow;
  const conf = continentOf(getClub(player.clubId)?.country);
  // the continental champion goes on to the World Club Cup
  const nextWorldClub = wonEliteCup(season.trophies);
  const nextEurope: EuroComp | null = zone === 'champions' ? eliteCup(conf) : zone === 'europa' ? challengeCup(conf) : null;
  if (zone === 'relegated') {
    p = { ...p, morale: clamp(p.morale - 10, 0, 100), rep: applyRep(p.rep, { fanPopularity: -4, coachTrust: -3 }) };
    nextNews = addNews(nextNews, mkNews(tr('⬇️ Relegation: the club drops to Division {n}.', { n: nextDivision }), 'bad'));
  } else if (zone === 'promoted') {
    p = { ...p, morale: clamp(p.morale + 10, 0, 100), rep: applyRep(p.rep, { fanPopularity: 5, coachTrust: 2, mediaHeat: 2 }) };
    nextNews = addNews(nextNews, mkNews(tr('⬆️ Promotion! The club rises to Division {n}.', { n: nextDivision }), 'gold'));
  } else if (nextEurope) {
    p = { ...p, rep: applyRep(p.rep, { fanPopularity: 3, mediaHeat: 3 }) };
    nextNews = addNews(nextNews, mkNews(tr('⭐ Qualified for the {comp} next season!', { comp: tr(nextEurope) }), 'gold'));
  }

  if (nextWorldClub) {
    nextNews = addNews(nextNews, mkNews(tr('🌍 Continental champions! The club will play the World Club Cup next season.'), 'gold'));
  }

  // the club's level follows its results: promotion strengthens the squad, relegation weakens it, and a good (or bad) season nudges it
  const clubNowId = player.clubId;
  const clubBoost = { ...(get().clubBoost ?? {}) };
  if (clubNowId) {
    const total = season.table.length;
    let delta = zone === 'promoted' ? 2 : zone === 'relegated' ? -2 : pos === 1 ? 2 : pos <= Math.ceil(total / 3) ? 1 : pos > Math.floor((total * 2) / 3) ? -1 : 0;
    // the biggest clubs are already at the top of the scale
    if (delta > 0 && (getClub(clubNowId)?.strength ?? 0) >= 90) delta = 0;
    const next = Math.max(-14, Math.min(18, (clubBoost[clubNowId] ?? 0) + delta));
    if (next !== (clubBoost[clubNowId] ?? 0)) {
      clubBoost[clubNowId] = next;
      if (zone === 'promoted') nextNews = addNews(nextNews, mkNews(tr('📈 The squad is reinforced for the step up: level +{n}.', { n: delta }), 'good'));
      else if (zone === 'relegated') nextNews = addNews(nextNews, mkNews(tr('📉 The squad weakens after relegation: level {n}.', { n: delta }), 'bad'));
    }
    setClubBoosts(clubBoost);
  }

  // your role in the squad: it changes with the years, the trust and the results
  {
    const st = squadStatus(p, [...history, record]);
    // a role is compared with the one you had at the same club: a new club starts you over
    const [prevClub, prevRole] = (p.squadStatus ?? '').split('|');
    if (prevRole && prevClub === (p.clubId ?? '') && prevRole !== st.id && st.id !== 'free') {
      const order: Record<string, number> = { newcomer: 0, marquee: 1, prospect: 1, rotation: 1, starter: 2, key: 3, star: 4, captain: 5, legend: 6 };
      const up = (order[st.id] ?? 0) >= (order[prevRole] ?? 0);
      nextNews = addNews(nextNews, mkNews(tr(up ? 'Your role in the squad: you are now {role}.' : 'Your role in the squad has dropped: you are now {role}.', { role: tr(STATUS_LABEL[st.id]) }), up ? 'good' : 'bad'));
      if (st.id === 'captain') p = { ...p, morale: clamp(p.morale + 6, 0, 100), rep: applyRep(p.rep, { lockerRoom: 3, fanPopularity: 2 }) };
      if (st.id === 'legend') p = { ...p, rep: applyRep(p.rep, { fanPopularity: 4, mediaHeat: 2 }) };
    }
    p = { ...p, squadStatus: `${p.clubId ?? ''}|${st.id}` };
  }

  const summary: SeasonSummary = {
    zone,
    division: divNow,
    nextDivision,
    nextEurope,
    nextWorldClub,
    record,
    ovrBefore,
    ovrAfter,
    delta: dev.delta,
    contractExpiring: !!p.contract && p.contract.yearsLeft <= 0,
    table,
    retiring: aged >= RETIRE_AGE,
    ballonDor: award,
  };

  nextNews = addNews(nextNews, mkNews(tr('Season {s} complete: {pos} in the league, OVR {a}→{b}.', { s: seasonLabel(season.year), pos: ordinalOf(pos), a: ovrBefore, b: ovrAfter }), ovrAfter >= ovrBefore ? 'good' : 'bad'));
  set({
    player: p,
    phase: 'season-end',
    history: [...history, record],
    lastSummary: summary,
    news: nextNews,
    division: nextDivision,
    europe: nextEurope,
    worldClub: nextWorldClub,
    clubBoost,
    offerKey: '',
  });
}
