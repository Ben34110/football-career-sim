import { CLUBS, COUNTRY_RIVALS, getClub, LEAGUE_RIVALS, LOCAL_RIVALS } from '../data/clubs';
import { OPPONENT_NATIONS, tournamentFor, youthTournamentFor } from '../data/nationalities';
import type {
  Club,
  Division,
  DrawCandidate,
  EuroComp,
  Fixture,
  FixtureResult,
  LeagueZone,
  Nationality,
  SeasonState,
  SeasonZones,
  TableRow,
} from '../types';
import { LEVEL_STRENGTH, nationalLevel, seasonLabel, type NationalLevel } from './player';
import { clamp, rand, randInt, shuffle, type Rng } from './rng';

const RIVAL_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#f43f5e', '#22c55e', '#eab308', '#14b8a6', '#fb7185', '#60a5fa', '#c084fc', '#f59e0b'];

const shortOf = (name: string) => {
  const w = name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean);
  return (w.length > 1 ? w[0].slice(0, 2) + w[1][0] : w[0].slice(0, 3)).toUpperCase();
};

const LEAGUE_MATCHES = 10;

/* ───────── Divisions: relegation, promotion and European places ───────── */

/** The division a club naturally plays in. */
export const baseDivision = (club: Club): Division => (club.tier <= 3 ? 1 : club.tier === 4 ? 2 : 3);

export const zonesFor = (d: Division): SeasonZones =>
  d === 1 ? { champions: 3, europa: 1, promo: 0, relegation: 2 } : d === 2 ? { champions: 0, europa: 0, promo: 2, relegation: 2 } : { champions: 0, europa: 0, promo: 2, relegation: 0 };

/** Where finishing `pos` (1-based, out of the whole table) leads. */
export function leagueZone(pos: number, d: Division, total: number): LeagueZone {
  const z = zonesFor(d);
  if (pos <= z.champions) return 'champions';
  if (pos <= z.champions + z.europa) return 'europa';
  if (pos <= z.promo) return 'promoted';
  if (z.relegation > 0 && pos > total - z.relegation) return 'relegated';
  return 'safe';
}

export const seasonZones = (s: SeasonState): SeasonZones => s.zones ?? zonesFor(s.division ?? 1);

/** Opposition is a notch stronger one division up, weaker one down. */
const divisionOffset = (club: Club, d: Division) => (baseDivision(club) - d) * 6;

export interface SeasonOptions {
  division?: Division;
  europe?: EuroComp | null;
}

/** The European run: a short group stage with fixed opponents, then four draws. */
function buildEurope(year: number, club: Club, comp: EuroComp, rng: Rng): Fixture[] {
  const boost = comp === 'Champions League' ? 6 : 1;
  const foreign = shuffle(CLUBS.filter((c) => c.country !== club.country && c.tier <= 3), rng);
  const used = new Set<string>();
  const next = (): Club => {
    const c = foreign.find((x) => !used.has(x.id)) ?? foreign[0];
    used.add(c.id);
    return c;
  };
  const cand = (c: Club, str: number): DrawCandidate => ({
    opponent: c.name,
    opponentShort: c.short,
    opponentStrength: clamp(Math.round(str), 45, 95),
    opponentColor: c.color,
  });

  const groupSpread = shuffle([-3, 1, 4], rng);
  const group: Fixture[] = groupSpread.map((sp, i) => ({
    id: `${year}-E${i + 1}`,
    kind: 'euro' as const,
    label: `${comp} Group Match ${i + 1}`,
    ...cand(next(), club.strength + boost + sp),
    home: i !== 1,
    knockout: false,
    status: 'upcoming' as const,
  }));

  const rounds: [string, number][] = [
    ['Round of 16', 1],
    ['Quarter-Final', 2],
    ['Semi-Final', 3],
    ['Final', 4],
  ];
  const knock: Fixture[] = rounds.map(([r, extra], i) => {
    const spread = shuffle([-5, -1, 2, 6], rng);
    const pool = spread.map((sp) => cand(next(), club.strength + boost + extra + sp));
    return {
      id: `${year}-E${i + 4}`,
      kind: 'euro' as const,
      label: `${comp} ${r}`,
      ...pool[0],
      home: i % 2 === 0,
      knockout: true,
      status: 'upcoming' as const,
      drawn: false,
      pool,
    };
  });
  return [...group, ...knock];
}

export function generateSeason(year: number, club: Club, rng: Rng, opts: SeasonOptions = {}): SeasonState {
  const tier = club.tier;
  const division = opts.division ?? baseDivision(club);
  const offset = divisionOffset(club, division);
  // Starter leagues are played against clubs named after towns of that country
  // Opponents always come from the club's own country: first its league, then any town of the country
  const local = LOCAL_RIVALS[`${club.country}|${club.league}`] ?? LOCAL_RIVALS[club.league] ?? COUNTRY_RIVALS[club.country];
  const pool = shuffle((local ?? LEAGUE_RIVALS[tier]).filter((n) => n !== club.name), rng);
  const names = pool.slice(0, LEAGUE_MATCHES);
  const rivals = names.map((name, i) => ({
    id: `${year}-r${i}`,
    name,
    short: shortOf(name),
    strength: clamp(Math.round(club.strength + offset + rand(-9, 9, rng)), 45, 92),
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

  const cupLabels = ['Cup Quarter-Final', 'Cup Semi-Final', 'Cup Final'];
  const cupBoost = [rand(-3, 2, rng), rand(0, 5, rng), rand(2, 7, rng)];
  // The opponent of each round is only known after the draw: four balls, four possible clubs
  const cupSource = local ? pool : shuffle(LEAGUE_RIVALS[clamp(tier - 1, 1, 5) as 1 | 2 | 3 | 4 | 5], rng);
  const usedCup = new Set<string>();
  const cup: Fixture[] = cupLabels.map((label, i) => {
    const names: string[] = [];
    for (const n of cupSource) {
      if (names.length === 4) break;
      if (!usedCup.has(n)) names.push(n);
    }
    names.forEach((n) => usedCup.add(n));
    const spread = shuffle([-5, -1, 2, 6], rng);
    const pool: DrawCandidate[] = names.map((n, k) => ({
      opponent: n,
      opponentShort: shortOf(n),
      opponentStrength: clamp(Math.round(club.strength + cupBoost[i] + spread[k]), 45, 94),
      opponentColor: RIVAL_COLORS[(i * 4 + k + 3) % RIVAL_COLORS.length],
    }));
    return {
      id: `${year}-C${i + 1}`,
      kind: 'cup' as const,
      label,
      ...pool[0],
      home: i === 1 ? false : true,
      knockout: true,
      status: 'upcoming' as const,
      drawn: false,
      pool,
    };
  });

  // Interleave cup rounds (and the European run, if qualified) with the league run
  const eu = opts.europe ? buildEurope(year, club, opts.europe, rng) : [];
  const fixtures: Fixture[] = [
    league[0],
    ...(eu[0] ? [eu[0]] : []),
    ...league.slice(1, 3),
    cup[0],
    ...(eu[1] ? [eu[1]] : []),
    ...league.slice(3, 5),
    ...(eu[2] ? [eu[2]] : []),
    league[5],
    cup[1],
    ...(eu[3] ? [eu[3]] : []),
    ...league.slice(6, 8),
    ...(eu[4] ? [eu[4]] : []),
    league[8],
    cup[2],
    ...(eu[5] ? [eu[5]] : []),
    league[9],
    ...(eu[6] ? [eu[6]] : []),
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
    division,
    zones: zonesFor(division),
    europe: opts.europe ?? null,
    euroPts: 0,
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

/** The player picks a ball: the opponent of this round becomes known. */
export function applyDraw(season: SeasonState, fixtureId: string, index: number): SeasonState {
  return {
    ...season,
    fixtures: season.fixtures.map((f) => {
      if (f.id !== fixtureId || !f.pool) return f;
      const pick = f.pool[Math.max(0, Math.min(f.pool.length - 1, index))];
      return { ...f, ...pick, drawn: true };
    }),
  };
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

  if (fixture.kind === 'euro') {
    const comp = (season.europe ?? 'Champions League') as EuroComp;
    if (!fixture.knockout) {
      next.euroPts = (next.euroPts ?? 0) + (result.outcome === 'W' ? 3 : result.outcome === 'D' ? 1 : 0);
      // three group games: 4 points (a win and a draw) are needed to go through
      if (fixture.label.endsWith('Group Match 3') && (next.euroPts ?? 0) < 4) skipRest('euro');
    } else if (result.outcome === 'L') {
      skipRest('euro');
    } else if (fixture.label.endsWith(' Final')) {
      next.trophies = [...next.trophies, `${comp} ${seasonLabel(season.year)}`];
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

function nationOpponent(own: Nationality, boost: number, label: string, id: string, kind: Fixture['kind'], knockout: boolean, rng: Rng, level: NationalLevel = 'A'): Fixture {
  // opponents come from the competitive half of the world
  const pool = OPPONENT_NATIONS.filter((n) => n.code !== own.code && n.strength >= 66);
  const opp = pool[Math.floor(rng() * pool.length)];
  return {
    id,
    kind,
    label,
    opponent: level === 'A' ? opp.name : `${opp.name} ${level}`,
    opponentShort: `${opp.flag} ${opp.code}`,
    opponentStrength: clamp(Math.round(opp.strength + LEVEL_STRENGTH[level] + boost + rand(-2, 2, rng)), 50, 95),
    opponentColor: '#fbbf24',
    home: rng() < 0.5,
    knockout,
    status: 'upcoming',
    level: level === 'A' ? undefined : level,
  };
}

/**
 * Insert international fixtures when the player's OVR qualifies them.
 * Safe to call after every match.
 */
export function queueCallUps(season: SeasonState, ovr: number, nat: Nationality, rng: Rng, age = 18): SeasonState {
  const level = nationalLevel(ovr, age);
  if (!level) return season;
  let next = season;
  const upcomingIdx = firstUpcoming(next);
  const played = next.fixtures.filter((f) => f.status === 'played').length;

  // International window mid-season
  if (!next.callUpQueued && upcomingIdx !== -1 && played >= 4 && next.fixtures.some((f) => f.kind === 'league' && f.status === 'upcoming')) {
    const qualifier = nationOpponent(nat, -2, level === 'A' ? 'International Qualifier' : level === 'U23' ? 'U23 International' : 'U20 International', `${next.year}-I1`, 'intl', false, rng, level);
    const fixtures = [...next.fixtures];
    fixtures.splice(upcomingIdx + 1, 0, qualifier);
    next = { ...next, fixtures, callUpQueued: true };
  }

  // Summer tournament once the domestic calendar is done
  const tournament = level === 'A' ? tournamentFor(next.year + 1, nat) : youthTournamentFor(level, next.year + 1, nat);
  const domesticLeft = next.fixtures.some((f) => f.status === 'upcoming' && (f.kind === 'league' || f.kind === 'cup' || f.kind === 'intl' || f.kind === 'euro'));
  if (!next.tournamentQueued && tournament && !domesticLeft) {
    const stages: [string, number, boolean][] = [
      ['Group Stage Decider', -3, false],
      ['Quarter-Final', 0, true],
      ['Semi-Final', 2, true],
      ['Final', 4, true],
    ];
    const extra = stages.map(([label, boost, ko], i) => {
      // four possible opponents per stage, of different strength
      const spread = shuffle([-5, -1, 2, 6], rng);
      const options = Array.from({ length: 4 }, (_, k) => nationOpponent(nat, boost + spread[k], label, `${next.year}-T${i + 1}`, 'tournament', ko, rng, level));
      const names = new Set<string>();
      const pool: DrawCandidate[] = options
        .filter((o) => !names.has(o.opponent) && names.add(o.opponent))
        .map((o) => ({ opponent: o.opponent, opponentShort: o.opponentShort, opponentStrength: o.opponentStrength, opponentColor: o.opponentColor }));
      return { ...options[0], ...pool[0], drawn: false, pool };
    });
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
