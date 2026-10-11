import { CLUBS } from '../data/clubs';
import type { BallonDorEntry, BallonDorResult } from '../types';
import { clamp, shuffle, type Rng } from './rng';

/** Invented superstars — no real people. */
const RIVAL_NAMES = [
  'L. Marchetti', 'E. Haugen', 'J. Whitfield', 'V. Paixão', 'R. Okonkwo', 'T. Duval', 'M. Salgado', 'K. Aoyama',
  'D. Petrović', 'A. Benali', 'S. Lindqvist', 'N. Cardoso', 'H. Mensah', 'F. Ruiz-Vega',
];

export interface SeasonForAward {
  ovr: number;
  goals: number;
  assists: number;
  avgRating: number;
  trophies: string[];
  fanPopularity: number;
  mediaHeat: number;
  clubName: string;
  playerName: string;
}

const trophyPoints = (t: string) => {
  if (t.startsWith('League Title')) return 10;
  if (/^World Club Cup/.test(t)) return 12;
  if (/^Europe Elite Cup/.test(t)) return 14;
  if (/^Europe Challenge Cup/.test(t)) return 7;
  // the other continents' club cups count for less in the Golden Star vote
  if (/^(Africa|South America|Asia|North America) Elite Cup/.test(t)) return 9;
  if (/^(Africa|South America|Asia|North America) Challenge Cup/.test(t)) return 4;
  if (t.startsWith('Domestic Cup')) return 5;
  if (t.startsWith('World Nations Cup')) return 22;
  // youth trophies are a stepping stone, not a Golden Star argument
  if (t.startsWith('U20')) return 2;
  if (t.startsWith('U23')) return 3;
  if (t.startsWith('Summer Games')) return 6;
  if (t.startsWith('European Nations Trophy')) return 8;
  return 13; // continental nations tournament
};

export function ballonDorScore(s: SeasonForAward): number {
  return (
    s.ovr +
    s.goals * 1.0 +
    s.assists * 0.5 +
    Math.max(0, s.avgRating - 6) * 12 +
    s.trophies.reduce((a, t) => a + trophyPoints(t), 0) +
    s.fanPopularity / 10 +
    s.mediaHeat / 20
  );
}

/**
 * Season-end Golden Star: the player is ranked against nine invented rivals.
 * Returns undefined when the player isn't even in the conversation.
 */
export function runBallonDor(s: SeasonForAward, rng: Rng): BallonDorResult | undefined {
  const mine = ballonDorScore(s);
  if (s.ovr < 75 || mine < 105) return undefined;

  const names = shuffle(RIVAL_NAMES, rng).slice(0, 9);
  const topClubs = CLUBS.filter((c) => c.tier <= 2);
  const rivals = names.map((name, i) => ({
    name,
    club: topClubs[Math.floor(rng() * topClubs.length)].name,
    score: clamp(172 - i * 6 + (rng() - 0.5) * 20, 90, 195),
  }));

  const all: BallonDorEntry[] = [...rivals, { name: s.playerName, club: s.clubName, score: mine, isMe: true }];
  const ranking = all
    .sort((a, b) => b.score - a.score)
    .map((e) => ({ ...e, score: Math.round(e.score) }));
  const rank = ranking.findIndex((e) => e.isMe) + 1;
  return { ranking, rank, won: rank === 1 };
}
