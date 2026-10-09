'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getClub } from './data/clubs';
import { getNationality } from './data/nationalities';
import type { StanceEffect } from './data/speeches';
import type { PressAnswer } from './data/press';
import type { Effect } from './data/controversies';
import { useUiStore } from './ui';
import { galaCost, MAX_UPGRADE_LEVEL, UPGRADES, upgradeCost, type UpgradeId } from './data/shop';
import {
  applyRep,
  ATTR_LABEL,
  nationalLevel,
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
import { ordinalOf, translate as tr } from './i18n';
import {
  applyDraw,
  applyFixtureResult,
  baseDivision,
  generateSeason,
  leagueZone,
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
  /** European competition qualified for next season */
  europe: EuroComp | null;
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
  /** The player picks a ball in the cup / tournament draw */
  drawFixture: (fixtureId: string, index: number) => void;
  applyStance: (s: StanceEffect) => void;
  adjust: (morale: number, rep: Partial<Reputation>) => void;
  commitMatch: (result: FixtureResult) => void;
  applyPress: (a: PressAnswer) => void;
  /** Apply the outcome of a scandal; returns true when the club terminated the contract. */
  resolveControversy: (e: Effect, title: string) => boolean;
  /** Feed the media with an extra headline (+Media Heat, small fan boost) */
  stirMedia: () => void;
  physio: () => Result;
  buyUpgrade: (id: UpgradeId) => Result;
  /** Charity gala: once a season, money for goodwill */
  donate: () => Result;
  /** Adds lives after a successful purchase */
  grantLives: (n: number) => void;
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
          division: baseDivision(club),
          europe: null,
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

      resetCareer: () => set({ ...initial }),

      retireNow: () => {
        const { player, news } = get();
        if (!player) return;
        set({ phase: 'retired', news: addNews(news, mkNews(tr('{name} hangs up the boots.', { name: player.name }), 'gold')) });
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
        const updated: Player = {
          ...player,
          attrs: xp.attrs,
          xp: xp.xp,
          form: [...player.form, result.rating].slice(-5),
          morale: clamp(morale + (result.subbedOff ? -4 : 0), 0, 100),
          rep: applyRep(player.rep, result.subbedOff ? { ...repDelta, coachTrust: repDelta.coachTrust - 2, lockerRoom: repDelta.lockerRoom - 1 } : repDelta),
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
        if (result.subbedOff) nextNews = addNews(nextNews, mkNews(tr('The coach hauled you off early after a poor display.'), 'bad'));
        for (const t of newTrophies) nextNews = addNews(nextNews, mkNews(tr('🏆 {t} — silverware!', { t: tr(t) }), 'gold'));
        const rank = { U20: 1, U23: 2, A: 3 } as const;
        const lvlBefore = nationalLevel(ovrOf(player), player.age);
        const lvlNow = nationalLevel(newOvr, player.age);
        if (lvlNow && (!lvlBefore || rank[lvlNow] > rank[lvlBefore])) {
          nextNews = addNews(
            nextNews,
            mkNews(lvlNow === 'A' ? tr('📣 OVR {n}! The national team is watching you.', { n: newOvr }) : tr('📣 OVR {n}! The {level} national team is watching you.', { n: newOvr, level: lvlNow }), 'gold'),
          );
        }
        if (fixture.kind === 'cup' && result.outcome === 'L') {
          nextNews = addNews(nextNews, mkNews(tr('Knocked out of the cup by {opp}.', { opp: fixture.opponent }), 'bad'));
        }

        nextSeason = queueCallUps(nextSeason, newOvr, getNationality(player.nationality), Math.random, player.age);
        if (nextSeason.callUpQueued && !season.callUpQueued) {
          const teamName = `${tr(getNationality(player.nationality).name)}${lvlNow && lvlNow !== 'A' ? ' ' + lvlNow : ''}`;
          nextNews = addNews(nextNews, mkNews(tr('🌍 Call-up! You’re named in the {team} squad.', { team: teamName }), 'gold'));
        }
        if (nextSeason.tournamentQueued && !season.tournamentQueued) {
          nextNews = addNews(nextNews, mkNews(tr('🌍 You’re heading to the {name}!', { name: tr(nextSeason.tournamentName ?? '') }), 'gold'));
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
          p = { ...p, strikes: 0, rep: applyRep(p.rep, { coachTrust: -15, fanPopularity: -6, lockerRoom: -6 }) };
          if (phase === 'season-end') {
            // the season is already over: simply make sure the contract is not renewed
            p = { ...p, rep: applyRep(p.rep, { coachTrust: 20 - p.rep.coachTrust }), contract: p.contract ? { ...p.contract, yearsLeft: 0 } : null };
            set({ player: p, news: addNews(nextNews, mkNews(tr('{club} will not renew your contract after repeated scandals.', { club: club?.name ?? '' }), 'bad')) });
          } else {
            p = { ...p, clubId: null, contract: null };
            set({
              player: p,
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
        const keepSeason = offer.source === 'renewal' ? season : generateSeason(year, club, Math.random);
        set({
          player: moved,
          season: keepSeason,
          ...(offer.source === 'renewal' ? {} : { division: baseDivision(club), europe: null }),
          phase: 'playing',
          offers: [],
          pendingMove: null,
          news: addNews(news, mkNews(tr(offer.source === 'renewal' ? 'Contract signed with {club}.' : '🖊️ Signed for {club}!', { club: club.name }), 'gold')),
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
            news: nextNews,
          });
          return;
        }
        set({
          year: nextYear,
          player: p,
          // a new club starts in its own division; otherwise the promotion / relegation / European place earned carries over
          season: generateSeason(nextYear, club, Math.random, pendingMove && pendingMove.source !== 'renewal' ? {} : { division: get().division, europe: get().europe }),
          ...(pendingMove && pendingMove.source !== 'renewal' ? { division: baseDivision(club), europe: null } : {}),
          phase: 'playing',
          pendingMove: null,
          lastSummary: null,
          news: addNews(nextNews, mkNews(tr('Season {s} begins at {club}.', { s: seasonLabel(nextYear), club: club.name }), 'neutral')),
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

  // Ballon d'Or: the player's season is ranked against nine invented superstars
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
    const t = `Ballon d’Or ${seasonLabel(season.year)}`;
    p = { ...p, trophies: [...p.trophies, t], rep: applyRep(p.rep, { fanPopularity: 8, mediaHeat: 6, lockerRoom: 2 }) };
    nextNews = addNews(nextNews, mkNews(tr('🏆 {t} — you are the best player in the world!', { t: tr(t) }), 'gold'));
  } else if (award) {
    nextNews = addNews(nextNews, mkNews(tr('Ballon d’Or: you finish {rank} in the vote.', { rank: ordinalOf(award.rank) }), 'neutral'));
  }

  // Where the league finish leads: Europe, promotion or relegation
  const divNow: Division = season.division ?? 1;
  const zone = leagueZone(pos, divNow, season.table.length);
  const nextDivision: Division = zone === 'promoted' ? ((divNow - 1) as Division) : zone === 'relegated' ? ((divNow + 1) as Division) : divNow;
  const nextEurope: EuroComp | null = zone === 'champions' ? 'Champions League' : zone === 'europa' ? 'Europa League' : null;
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

  const summary: SeasonSummary = {
    zone,
    division: divNow,
    nextDivision,
    nextEurope,
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
    offerKey: '',
  });
}
