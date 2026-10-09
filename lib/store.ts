'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getClub } from './data/clubs';
import { getNationality } from './data/nationalities';
import type { StanceEffect } from './data/speeches';
import type { PressAnswer } from './data/press';
import {
  applyRep,
  CALL_UP_OVR,
  createPlayer,
  fmtMoneyK,
  gainBolts,
  gainMatchXp,
  ovrOf,
  seasonDevelopment,
  seasonLabel,
  spendBolts,
  syncEnergy,
  trainAttr,
  wageFor,
  type CreateInput,
} from './engine/player';
import { clamp, uid } from './engine/rng';
import {
  applyFixtureResult,
  generateSeason,
  leaguePosition,
  queueCallUps,
  seasonFinished,
  sortTable,
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
  applyStance: (s: StanceEffect) => void;
  adjust: (morale: number, rep: Partial<Reputation>) => void;
  commitMatch: (result: FixtureResult) => void;
  applyPress: (a: PressAnswer) => void;
  train: (attr: AttrKey) => Result;
  physio: () => Result;
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
  text,
});

const addNews = (news: NewsItem[], ...items: NewsItem[]) => [...items.reverse(), ...news].slice(0, 14);

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initial,

      createCareer: (input) => {
        const player = createPlayer(input, Date.now());
        const club = getClub(input.clubId)!;
        const season = generateSeason(START_YEAR, club, Math.random);
        set({
          ...initial,
          hasCareer: true,
          year: START_YEAR,
          player,
          season,
          news: [mkNews(`${player.name} signs for ${club.name}. The journey begins.`, 'gold')],
        });
      },

      resetCareer: () => set({ ...initial }),

      retireNow: () => {
        const { player, news } = get();
        if (!player) return;
        set({ phase: 'retired', news: addNews(news, mkNews(`${player.name} hangs up the boots.`, 'gold')) });
      },

      beginMatch: () => {
        const { player } = get();
        if (!player) return false;
        const e = spendBolts(player.energy, 1, Date.now());
        if (!e) return false;
        set({ player: { ...player, energy: e } });
        return true;
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

      commitMatch: (result) => {
        const { player, season, news } = get();
        if (!player || !season) return;
        const fixture = season.fixtures.find((f) => f.status === 'upcoming');
        if (!fixture) return;

        let nextSeason = applyFixtureResult(season, result, Math.random);
        const xp = gainMatchXp(player, result.rating, Math.random);
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
        const updated: Player = {
          ...player,
          attrs: xp.attrs,
          xp: xp.xp,
          form: [...player.form, result.rating].slice(-5),
          morale,
          rep: applyRep(player.rep, repDelta),
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
          nextNews = addNews(nextNews, mkNews(`Attribute boost: +${xp.gained.length} after a ${result.rating.toFixed(1)} rating.`, 'good'));
        }
        for (const t of newTrophies) nextNews = addNews(nextNews, mkNews(`🏆 ${t} — silverware!`, 'gold'));
        if (newOvr >= CALL_UP_OVR && ovrOf(player) < CALL_UP_OVR) {
          nextNews = addNews(nextNews, mkNews(`📣 OVR ${newOvr}! The national team is watching you.`, 'gold'));
        }
        if (fixture.kind === 'cup' && result.outcome === 'L') {
          nextNews = addNews(nextNews, mkNews(`Knocked out of the cup by ${fixture.opponent}.`, 'bad'));
        }

        nextSeason = queueCallUps(nextSeason, newOvr, getNationality(player.nationality), Math.random);
        if (nextSeason.callUpQueued && !season.callUpQueued) {
          nextNews = addNews(nextNews, mkNews(`🌍 Call-up! You’re named in the ${getNationality(player.nationality).name} squad.`, 'gold'));
        }
        if (nextSeason.tournamentQueued && !season.tournamentQueued) {
          nextNews = addNews(nextNews, mkNews(`🌍 You’re heading to the ${nextSeason.tournamentName}!`, 'gold'));
        }

        set({ player: updated, season: nextSeason, news: nextNews });

        if (seasonFinished(nextSeason)) finishSeason(set, get);
      },

      applyPress: (a) => {
        const { player } = get();
        if (!player) return;
        // High media heat amplifies every answer (good or bad).
        const amp = 1 + player.rep.mediaHeat / 150;
        const scaled = Object.fromEntries(
          Object.entries(a.rep).map(([k, v]) => [k, Math.round((v as number) * amp)]),
        );
        set({
          player: { ...player, morale: clamp(player.morale + a.morale, 0, 100), rep: applyRep(player.rep, scaled) },
        });
      },

      train: (attr) => {
        const { player, season } = get();
        if (!player || !season) return { ok: false, msg: 'No active career.' };
        const used = season.training.cursor === season.cursor ? season.training.count : 0;
        if (used >= MAX_TRAININGS_PER_FIXTURE) {
          return { ok: false, msg: 'Coaches say that’s enough training before the next fixture.' };
        }
        const e = spendBolts(player.energy, 1, Date.now());
        if (!e) return { ok: false, msg: 'Not enough energy — rest up first.' };
        const t = trainAttr(player, attr, Math.random);
        set({
          player: { ...player, energy: e, attrs: t.attrs, xp: t.xp, morale: clamp(player.morale + 1, 0, 100) },
          season: { ...season, training: { cursor: season.cursor, count: used + 1 } },
        });
        return { ok: true, msg: t.levelUp ? `Breakthrough! ${attr} +1` : 'Solid session. Progress banked.' };
      },

      physio: () => {
        const { player } = get();
        if (!player || !player.contract) return { ok: false, msg: 'No active career.' };
        const now = Date.now();
        const e = syncEnergy(player.energy, now);
        if (e.bolts >= 5) return { ok: false, msg: 'You’re already fully charged.' };
        const cost = player.contract.wage * 3;
        if (player.money < cost) return { ok: false, msg: `You need ${fmtMoneyK(cost)} for the recovery clinic.` };
        set({ player: { ...player, money: player.money - cost, energy: gainBolts(e, 2, now) } });
        return { ok: true, msg: `Recovery clinic: +2 bolts (−${fmtMoneyK(cost)}).` };
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
        if (!player || !club) return { ok: false, msg: 'Unknown club.' };
        const win = transferWindow(season, phase, year);
        if (!win.open) return { ok: false, msg: 'The transfer window is closed.' };
        if (approached.includes(clubId)) return { ok: false, msg: 'Your agent already tried this window.' };
        const success = Math.random() < approachChance(player, club);
        const base = {
          approached: [...approached, clubId],
          player: { ...player, rep: applyRep(player.rep, { mediaHeat: 2 }) },
        };
        if (!success) {
          set({ ...base, news: addNews(news, mkNews(`${club.name} turned down your agent’s approach.`, 'bad')) });
          return { ok: false, msg: `${club.name} aren’t interested right now.` };
        }
        const offer = buildOffer(player, club, 'approach', Math.random);
        set({ ...base, offers: [offer, ...offers], news: addNews(news, mkNews(`${club.name} table an offer after your agent’s call.`, 'good')) });
        return { ok: true, msg: `${club.name} have made you an offer!` };
      },

      requestTransfer: () => {
        const { player, season, phase, year, transferListed, offers } = get();
        if (!player) return { ok: false, msg: 'No active career.' };
        const win = transferWindow(season, phase, year);
        if (!win.open) return { ok: false, msg: 'The transfer window is closed.' };
        if (transferListed) return { ok: false, msg: 'You’re already on the transfer list.' };
        const extra = generateOffers(player, true, Math.random).filter((o) => !offers.some((x) => x.clubId === o.clubId));
        set({
          transferListed: true,
          offers: [...offers, ...extra],
          player: { ...player, rep: applyRep(player.rep, { coachTrust: -6, lockerRoom: -3, fanPopularity: -2, mediaHeat: 4 }) },
        });
        return { ok: true, msg: `Transfer request filed. ${extra.length} new club${extra.length === 1 ? '' : 's'} enquired.` };
      },

      requestRenewal: () => {
        const { player, offers } = get();
        if (!player) return { ok: false, msg: 'No active career.' };
        if (offers.some((o) => o.source === 'renewal')) return { ok: false, msg: 'A renewal offer is already on the table.' };
        const offer = renewalOffer(player, Math.random);
        if (!offer) return { ok: false, msg: 'The manager isn’t convinced — build Coach Trust to 40+ first.' };
        set({ offers: [offer, ...offers] });
        return { ok: true, msg: 'The club tabled a new contract.' };
      },

      counter: (offerId, mult) => {
        const { player, offers, news } = get();
        const offer = offers.find((o) => o.id === offerId);
        if (!player || !offer) return { ok: false, msg: 'Offer not found.' };
        if (offer.countered) return { ok: false, msg: 'You’ve already countered this offer.' };
        const club = getClub(offer.clubId);
        if (Math.random() < counterChance(player, mult)) {
          set({ offers: offers.map((o) => (o.id === offerId ? { ...o, wage: Math.round(o.wage * mult), countered: true } : o)) });
          return { ok: true, msg: `${club?.name} accepted your counter-offer!` };
        }
        set({
          offers: offers.filter((o) => o.id !== offerId),
          news: addNews(news, mkNews(`${club?.name} withdrew their offer after your wage demand.`, 'bad')),
        });
        return { ok: false, msg: `${club?.name} walked away from the table.` };
      },

      declineOffer: (offerId) => set({ offers: get().offers.filter((o) => o.id !== offerId) }),

      signOffer: (offerId) => {
        const { player, season, phase, year, offers, news } = get();
        const offer = offers.find((o) => o.id === offerId);
        const club = offer ? getClub(offer.clubId) : undefined;
        if (!player || !offer || !club) return { ok: false, msg: 'Offer not found.' };
        const win = transferWindow(season, phase, year);
        if (!win.open) return { ok: false, msg: 'The transfer window is closed.' };

        if (!win.immediate) {
          set({
            pendingMove: offer,
            news: addNews(news, mkNews(`Agreed: ${offer.source === 'renewal' ? 'new deal at' : 'joining'} ${club.name} next season.`, 'gold')),
          });
          return { ok: true, msg: `Deal agreed — it takes effect next season.` };
        }

        const moved = applyMove(player, offer);
        const keepSeason = offer.source === 'renewal' ? season : generateSeason(year, club, Math.random);
        set({
          player: moved,
          season: keepSeason,
          phase: 'playing',
          offers: [],
          pendingMove: null,
          news: addNews(news, mkNews(offer.source === 'renewal' ? `Contract signed with ${club.name}.` : `🖊️ Signed for ${club.name}!`, 'gold')),
        });
        return { ok: true, msg: `Welcome to ${club.name}!` };
      },

      cancelPendingMove: () => set({ pendingMove: null }),

      startNextSeason: () => {
        const { player, year, pendingMove, news } = get();
        if (!player) return;
        if (player.age >= RETIRE_AGE) {
          set({ phase: 'retired', news: addNews(news, mkNews(`${player.name} retires at ${player.age}.`, 'gold')) });
          return;
        }
        const nextYear = year + 1;
        let p = player;
        let nextNews = news;

        if (pendingMove) {
          p = applyMove(p, pendingMove);
        } else if (p.contract && p.contract.yearsLeft <= 0) {
          const club = getClub(p.clubId);
          if (club && p.rep.coachTrust >= 35) {
            const wage = Math.round(wageFor(ovrOf(p), p.age, club.tier) * 1.05);
            p = { ...p, contract: { wage, yearsLeft: 2 } };
            nextNews = addNews(nextNews, mkNews(`${club.name} extend your deal by two years.`, 'good'));
          } else {
            p = { ...p, clubId: null, contract: null };
            nextNews = addNews(nextNews, mkNews('Your contract expired and was not renewed. You’re a free agent.', 'bad'));
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
            news: nextNews,
          });
          return;
        }
        set({
          year: nextYear,
          player: p,
          season: generateSeason(nextYear, club, Math.random),
          phase: 'playing',
          pendingMove: null,
          lastSummary: null,
          news: addNews(nextNews, mkNews(`Season ${seasonLabel(nextYear)} begins at ${club.name}.`, 'neutral')),
        });
      },
    }),
    {
      name: 'fcs-save-v1',
      version: 1,
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : window.localStorage) as Storage),
      skipHydration: true,
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
    p = { ...p, trophies: [...p.trophies, t] };
    nextNews = addNews(nextNews, mkNews(`🏆 ${t} — champions!`, 'gold'));
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
    xp: { finishing: 0, composure: 0, vision: 0, stamina: 0 },
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

  const summary: SeasonSummary = {
    record,
    ovrBefore,
    ovrAfter,
    delta: dev.delta,
    contractExpiring: !!p.contract && p.contract.yearsLeft <= 0,
    table,
    retiring: aged >= RETIRE_AGE,
  };

  nextNews = addNews(nextNews, mkNews(`Season ${seasonLabel(season.year)} complete: ${pos}${ordinal(pos)} in the league, OVR ${ovrBefore}→${ovrAfter}.`, ovrAfter >= ovrBefore ? 'good' : 'bad'));
  set({
    player: p,
    phase: 'season-end',
    history: [...history, record],
    lastSummary: summary,
    news: nextNews,
    offerKey: '',
  });
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};
