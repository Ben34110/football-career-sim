import { getClub, LEAGUE_RIVALS, LOCAL_RIVALS } from '../data/clubs';
import { OPPONENT_NATIONS, tournamentFor } from '../data/nationalities';
import type {
  Club,
  Fixture,
  FixtureResult,
  Nationality,
  SeasonState,
  TableRow,
} from '../types';
import { CALL_UP_OVR, seasonLabel } from './player';
import { clamp, rand, randInt, shuffle, type Rng } from './rng';

const RIVAL_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#f43f5e', '#22c55e', '#eab308', '#14b8a6', '#fb7185', '#60a5fa', '#c084fc', '#f59e0b'];

const shortOf = (name: string) => {
  const w = name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean);
  return (w.length > 1 ? w[0].slice(0, 2) + w[1][0] : w[0].slice(0, 3)).toUpperCase();
};

const LEAGUE_MATCHES = 10;

export function generateSeason(year: number, club: Club, rng: Rng): SeasonState {
  const tier = club.tier;
  // Starter leagues are played against clubs named after towns of that country
  const local = LOCAL_RIVALS[`${club.country}|${club.league}`] ?? LOCAL_RIVALS[club.league];
  const pool = shuffle(local ?? LEAGUE_RIVALS[tier], rng);
  const names = pool.slice(0, LEAGUE_MATCHES);
  const rivals = names.map((name, i) => ({
    id: `${year}-r${i}`,
    name,
    short: shortOf(name),
    strength: clamp(Math.round(club.strength + rand(-9, 9, rng)), 45, 92),
    color: RIVAL_COLORS[i % RIVAL_COLORS.length],
  }));

  const table: TableRow[] = [
    { id: 'me', name: club.name, short: club.short, strength: club.strength, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0, isMe: true },
    ...rivals.map((r) => ({
      id: r.id,
      name: r.name,
      short: r.short,
      strength: r.strength,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    })),
  ];

  const league: Fixture[] = rivals.map((r, i) => ({
    id: `${year}-L${i + 1}`,
    kind: 'league',
    label: `Matchday ${i + 1}`,
    opponent: r.name,
    opponentShort: r.short,
    opponentStrength: r.strength,
    opponentColor: r.color,
    home: i % 2 === 0,
    knockout: false,
    status: 'upcoming',
  }));

  const cupNames = local
    ? pool.slice(LEAGUE_MATCHES, LEAGUE_MATCHES + 3)
    : shuffle(LEAGUE_RIVALS[clamp(tier - 1, 1, 5) as 1 | 2 | 3 | 4 | 5], rng).slice(0, 3);
  const cupLabels = ['Cup Quarter-Final', 'Cup Semi-Final', 'Cup Final'];
  const cupBoost = [rand(-3, 2, rng), rand(0, 5, rng), rand(2, 7, rng)];
  const cup: Fixture[] = cupLabels.map((label, i) => ({
    id: `${year}-C${i + 1}`,
    kind: 'cup',
    label,
    opponent: cupNames[i],
    opponentShort: shortOf(cupNames[i]),
    opponentStrength: clamp(Math.round(club.strength + cupBoost[i]), 45, 94),
    opponentColor: RIVAL_COLORS[(i + 3) % RIVAL_COLORS.length],
    home: i === 1 ? false : true,
    knockout: true,
    status: 'upcoming',
  }));

  // Interleave cup rounds with the league run
  const fixtures: Fixture[] = [
    ...league.slice(0, 3),
    cup[0],
    ...league.slice(3, 6),
    cup[1],
    ...league.slice(6, 9),
    cup[2],
    ...league.slice(9),
  ];

  return {
    year,
    fixtures,
    cursor: 0,
    table,
    cupAlive: true,
    tournamentAlive: false,
    tournamentName: null,
    callUpQueued: false,
    tournamentQueued: false,
    training: { cursor: 0, count: 0 },
    stats: { apps: 0, goals: 0, assists: 0, ratingSum: 0 },
    trophies: [],
  };
}

export const firstUpcoming = (s: SeasonState) => s.fixtures.findIndex((f) => f.status === 'upcoming');
export const seasonFinished = (s: SeasonState) => firstUpcoming(s) === -1;
export const currentFixture = (s: SeasonState): Fixture | null => s.fixtures[firstUpcoming(s)] ?? null;

export function sortTable(table: TableRow[]): TableRow[] {
  return [...table].sort(
    (a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name),
  );
}

export const leaguePosition = (s: SeasonState) => sortTable(s.table).findIndex((r) => r.isMe) + 1;

/* ───────── Applying a result ───────── */

function updateTable(table: TableRow[], fixture: Fixture, r: FixtureResult, rng: Rng): TableRow[] {
  const meanStrength = table.reduce((s, t) => s + t.strength, 0) / table.length;
  const played = r.outcome;
  return table.map((row) => {
    if (row.isMe) {
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (played === 'W' ? 1 : 0),
        drawn: row.drawn + (played === 'D' ? 1 : 0),
        lost: row.lost + (played === 'L' ? 1 : 0),
        gf: row.gf + r.myScore,
        ga: row.ga + r.oppScore,
        pts: row.pts + (played === 'W' ? 3 : played === 'D' ? 1 : 0),
      };
    }
    if (row.name === fixture.opponent) {
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (played === 'L' ? 1 : 0),
        drawn: row.drawn + (played === 'D' ? 1 : 0),
        lost: row.lost + (played === 'W' ? 1 : 0),
        gf: row.gf + r.oppScore,
        ga: row.ga + r.myScore,
        pts: row.pts + (played === 'L' ? 3 : played === 'D' ? 1 : 0),
      };
    }
    // Everyone else plays someone else this matchday
    const pw = clamp(0.38 + (row.strength - meanStrength) / 70, 0.14, 0.7);
    const roll = rng();
    const won = roll < pw;
    const drawn = !won && roll < pw + 0.25;
    const gf = won ? randInt(1, 3, rng) : drawn ? randInt(0, 2, rng) : randInt(0, 1, rng);
    const ga = won ? randInt(0, gf - 1, rng) : drawn ? gf : gf + randInt(1, 2, rng);
    return {
      ...row,
      played: row.played + 1,
      won: row.won + (won ? 1 : 0),
      drawn: row.drawn + (drawn ? 1 : 0),
      lost: row.lost + (!won && !drawn ? 1 : 0),
      gf: row.gf + gf,
      ga: row.ga + ga,
      pts: row.pts + (won ? 3 : drawn ? 1 : 0),
    };
  });
}

export function applyFixtureResult(season: SeasonState, result: FixtureResult, rng: Rng): SeasonState {
  const idx = firstUpcoming(season);
  if (idx === -1) return season;
  const fixture = season.fixtures[idx];
  const fixtures = season.fixtures.map((f, i) => (i === idx ? { ...f, status: 'played' as const, result } : f));
  let next: SeasonState = {
    ...season,
    fixtures,
    stats: {
      apps: season.stats.apps + 1,
      goals: season.stats.goals + result.goals,
      assists: season.stats.assists + result.assists,
      ratingSum: season.stats.ratingSum + result.rating,
    },
  };

  if (fixture.kind === 'league') {
    next.table = updateTable(season.table, fixture, result, rng);
  }

  const skipRest = (kind: Fixture['kind']) => {
    next = {
      ...next,
      fixtures: next.fixtures.map((f) => (f.kind === kind && f.status === 'upcoming' ? { ...f, status: 'skipped' as const } : f)),
    };
  };

  if (fixture.kind === 'cup') {
    if (result.outcome === 'L') {
      next.cupAlive = false;
      skipRest('cup');
    } else if (fixture.label === 'Cup Final') {
      next.trophies = [...next.trophies, `Domestic Cup ${seasonLabel(season.year)}`];
    }
  }

  if (fixture.kind === 'tournament') {
    if (result.outcome === 'L') {
      next.tournamentAlive = false;
      skipRest('tournament');
    } else if (fixture.label === 'Final') {
      next.tournamentAlive = false;
      next.trophies = [...next.trophies, `${season.tournamentName} ${season.year + 1}`];
    }
  }

  next.cursor = firstUpcoming(next) === -1 ? next.fixtures.length : firstUpcoming(next);
  return next;
}

/* ───────── National team call-ups ───────── */

function nationOpponent(own: Nationality, boost: number, label: string, id: string, kind: Fixture['kind'], knockout: boolean, rng: Rng): Fixture {
  // opponents come from the competitive half of the world
  const pool = OPPONENT_NATIONS.filter((n) => n.code !== own.code && n.strength >= 66);
  const opp = pool[Math.floor(rng() * pool.length)];
  return {
    id,
    kind,
    label,
    opponent: opp.name,
    opponentShort: `${opp.flag} ${opp.code}`,
    opponentStrength: clamp(Math.round(opp.strength + boost + rand(-2, 2, rng)), 55, 95),
    opponentColor: '#fbbf24',
    home: rng() < 0.5,
    knockout,
    status: 'upcoming',
  };
}

/**
 * Insert international fixtures when the player's OVR qualifies them.
 * Safe to call after every match.
 */
export function queueCallUps(season: SeasonState, ovr: number, nat: Nationality, rng: Rng): SeasonState {
  if (ovr < CALL_UP_OVR) return season;
  let next = season;
  const upcomingIdx = firstUpcoming(next);
  const played = next.fixtures.filter((f) => f.status === 'played').length;

  // International window mid-season
  if (!next.callUpQueued && upcomingIdx !== -1 && played >= 4 && next.fixtures.some((f) => f.kind === 'league' && f.status === 'upcoming')) {
    const qualifier = nationOpponent(nat, -2, 'International Qualifier', `${next.year}-I1`, 'intl', false, rng);
    const fixtures = [...next.fixtures];
    fixtures.splice(upcomingIdx + 1, 0, qualifier);
    next = { ...next, fixtures, callUpQueued: true };
  }

  // Summer tournament once the domestic calendar is done
  const tournament = tournamentFor(next.year + 1, nat);
  const domesticLeft = next.fixtures.some((f) => f.status === 'upcoming' && (f.kind === 'league' || f.kind === 'cup' || f.kind === 'intl'));
  if (!next.tournamentQueued && tournament && !domesticLeft) {
    const stages: [string, number, boolean][] = [
      ['Group Stage Decider', -3, false],
      ['Quarter-Final', 0, true],
      ['Semi-Final', 2, true],
      ['Final', 4, true],
    ];
    const extra = stages.map(([label, boost, ko], i) => nationOpponent(nat, boost, label, `${next.year}-T${i + 1}`, 'tournament', ko, rng));
    next = {
      ...next,
      fixtures: [...next.fixtures, ...extra],
      tournamentQueued: true,
      tournamentAlive: true,
      tournamentName: tournament,
    };
  }
  next.cursor = firstUpcoming(next) === -1 ? next.fixtures.length : firstUpcoming(next);
  return next;
}

export function describeClub(id: string | null) {
  const c = getClub(id);
  return c ? `${c.name} · ${c.league}` : 'Free agent';
}
