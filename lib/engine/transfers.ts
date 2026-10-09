import { CLUBS, getClub } from '../data/clubs';
import type { Club, GamePhase, Offer, Player, SeasonState } from '../types';
import { marketValue, ovrOf, wageFor } from './player';
import { clamp, rand, randInt, uid, weightedPick, type Rng } from './rng';

export interface TransferWindow {
  open: boolean;
  /** Signing applies right now, or on 1 July */
  immediate: boolean;
  kind: 'summer' | 'winter' | 'closed';
  key: string;
  label: string;
}

export function transferWindow(season: SeasonState | null, phase: GamePhase, year: number): TransferWindow {
  if (phase === 'retired') return { open: false, immediate: false, kind: 'closed', key: 'closed', label: 'Retired' };
  if (phase === 'free-agent') {
    return { open: true, immediate: true, kind: 'summer', key: `${year}-summer`, label: 'Summer window · free agent' };
  }
  if (phase === 'season-end') {
    return { open: true, immediate: false, kind: 'summer', key: `${year + 1}-summer`, label: 'Summer window · joins next season' };
  }
  if (!season) return { open: false, immediate: false, kind: 'closed', key: 'closed', label: 'Window closed' };
  if (season.cursor === 0) {
    return { open: true, immediate: true, kind: 'summer', key: `${year}-summer`, label: 'Summer window' };
  }
  const played = season.fixtures.filter((f) => f.status === 'played').length;
  if (played >= 5 && played <= 8) {
    return { open: true, immediate: false, kind: 'winter', key: `${year}-winter`, label: 'Winter window · joins in summer' };
  }
  return { open: false, immediate: false, kind: 'closed', key: 'closed', label: 'Window closed' };
}

const roleFor = (c: Club, ovr: number) =>
  ovr >= c.strength + 2 ? 'a marquee signing' : ovr >= c.strength - 4 ? 'a first-team starter' : 'a rotation option';

export function buildOffer(player: Player, club: Club, source: Offer['source'], rng: Rng): Offer {
  const ovr = ovrOf(player);
  const mv = marketValue(ovr, player.age);
  const fee = Math.round(mv * rand(0.9, 1.4, rng) * 100) / 100;
  const wage = Math.round(wageFor(ovr, player.age, club.tier) * rand(0.95, 1.2, rng));
  return {
    id: uid('offer'),
    clubId: club.id,
    fee,
    wage,
    years: randInt(2, 5, rng),
    source,
    note: `${club.name} see you as ${roleFor(club, ovr)}.`,
  };
}

export function generateOffers(player: Player, listed: boolean, rng: Rng): Offer[] {
  const ovr = ovrOf(player);
  const current = getClub(player.clubId);
  const eligible = CLUBS.filter((c) => c.id !== player.clubId && c.strength <= ovr + 7 && c.strength >= ovr - 22);
  if (eligible.length === 0) return [];
  const n = clamp(1 + Math.floor((player.rep.fanPopularity + player.rep.mediaHeat) / 70) + (listed ? 2 : 0) + randInt(0, 1, rng), 1, 5);
  const pool = [...eligible];
  const offers: Offer[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const c = weightedPick(pool, (cl) => Math.exp(((cl.strength - (current?.strength ?? 55)) / 8)) + 0.2, rng);
    pool.splice(pool.indexOf(c), 1);
    const o = buildOffer(player, c, 'incoming', rng);
    if (o.fee <= c.budget) offers.push(o);
  }
  return offers;
}

export function approachChance(player: Player, club: Club): number {
  const ovr = ovrOf(player);
  return clamp(0.5 + (ovr - (club.strength - 3)) / 14 + (player.rep.fanPopularity + player.rep.mediaHeat - 60) / 500, 0.03, 0.9);
}

export const COUNTER_OPTIONS = [
  { mult: 1.1, label: '+10% wage' },
  { mult: 1.25, label: '+25% wage' },
] as const;

export function counterChance(player: Player, mult: number): number {
  return clamp(0.8 - (mult - 1) * 2.2 + (player.rep.fanPopularity + player.rep.mediaHeat - 60) / 600, 0.1, 0.85);
}

export function renewalOffer(player: Player, rng: Rng): Offer | null {
  const club = getClub(player.clubId);
  if (!club || player.rep.coachTrust < 40) return null;
  const ovr = ovrOf(player);
  const bump = 1.05 + (player.rep.coachTrust - 40) / 400;
  return {
    id: uid('offer'),
    clubId: club.id,
    fee: 0,
    wage: Math.round(wageFor(ovr, player.age, club.tier) * bump * rand(0.98, 1.05, rng)),
    years: 3,
    source: 'renewal',
    note: `${club.name} want to build around you.`,
  };
}

/** Free-agent offers handed out when a contract expires without a renewal. */
export function freeAgentOffers(player: Player, rng: Rng): Offer[] {
  const ovr = ovrOf(player);
  const pool = CLUBS.filter((c) => c.strength <= ovr + 4 && c.strength >= ovr - 20 && c.id !== player.clubId);
  const base = pool.length ? pool : CLUBS.filter((c) => c.tier >= 4);
  const picks: Offer[] = [];
  const bag = [...base];
  for (let i = 0; i < 3 && bag.length; i++) {
    const c = bag.splice(Math.floor(rng() * bag.length), 1)[0];
    picks.push({ ...buildOffer(player, c, 'incoming', rng), fee: 0 });
  }
  return picks;
}
