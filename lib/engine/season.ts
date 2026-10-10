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
  TournamentState,
} from '../types';
import { LEVEL_STRENGTH, nationalLevel, seasonLabel, type NationalLevel } from './player';
import { chosenByPot, createEuroDraw, createTournament, drawGroup, drawPool, groupMatchday, knockoutFixture, myGroupRank, opponentKey, playOut, playRound, roundIndex, startKnockout } from './tournament';
import { finalFor, simulateScore, type OtherGame } from './livefeed';
import { clamp, mulberry32, rand, randInt, shuffle, type Rng } from './rng';

const RIVAL_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#f43f5e', '#22c55e', '#eab308', '#14b8a6', '#fb7185', '#60a5fa', '#c084fc', '#f59e0b'];

const shortOf = (name: string) => {
  const w = name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean);
  return (w.length > 1 ? w[0].slice(0, 2) + w[1][0] : w[0].slice(0, 3)).toUpperCase();
};

const LEAGUE_MATCHES = 10;

/* ───────── Divisions: relegation, promotion and European places ───────── */

/** The division a club naturally plays in. */
export const baseDivision = (club: Club): Division => (club.tier <= 3 ? 1 : club.tier === 4 ? 2 : 3);

/**
 * A club you join arrives with a history: last season it may already have qualified for Europe.
 * Elite clubs usually play the Champions League, solid top-flight clubs the Europa League, lower ones rarely.
 */
export function europeFor(club: Club, rng: Rng): EuroComp | null {
  if (club.tier > 3) return null;
  const roll = rng();
  if (club.tier === 1) return roll < 0.8 ? 'Champions League' : roll < 0.95 ? 'Europa League' : null;
  if (club.tier === 2) return roll < 0.25 ? 'Champions League' : roll < 0.65 ? 'Europa League' : null;
  return roll < 0.15 ? 'Europa League' : null;
}

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
function buildEurope(year: number, club: Club, comp: EuroComp, rng: Rng): { fixtures: Fixture[]; draw: TournamentState } {
  const boost = comp === 'Champions League' ? 6 : 1;
  // top clubs first, smaller ones only to fill the pots
  const abroad = CLUBS.filter((c) => c.country !== club.country);
  const foreign = [...shuffle(abroad.filter((c) => c.tier <= 3), rng), ...shuffle(abroad.filter((c) => c.tier > 3), rng)];
  const used = new Set<string>();
  // never the same club twice in one round, even when the supply of fresh clubs runs out
  const next = (round?: Set<string>): Club => {
    const c = foreign.find((x) => !used.has(x.id)) ?? foreign.find((x) => !round?.has(x.id)) ?? foreign[0];
    used.add(c.id);
    round?.add(c.id);
    return c;
  };
  const cand = (c: Club, str: number): DrawCandidate => ({
    opponent: c.name,
    opponentShort: c.short,
    opponentStrength: clamp(Math.round(str), 45, 95),
    opponentColor: c.color,
  });

  // the group stage is drawn from four pots: you and fifteen clubs, ranked by level (a club's tier sets how it ranks among them)
  const shift = (club.tier - 2) * 4 + boost / 2;
  const fifteen = foreign.slice(0, 15).map((c) => {
    used.add(c.id);
    return { name: c.name, short: c.short, color: c.color, strength: clamp(Math.round(club.strength + shift + rand(-9, 9, rng)), 45, 95) };
  });
  const draw = createEuroDraw({ name: club.name, short: club.short, color: club.color, strength: club.strength }, fifteen, rng);
  const group: Fixture[] = draw.potOrder.map((p, i) => {
    const pool = drawPool(draw, p);
    return {
      id: `${year}-E${i + 1}`,
      kind: 'euro' as const,
      label: `${comp} Group Match ${i + 1}`,
      ...pool[0],
      home: i !== 1,
      knockout: false,
      status: 'upcoming' as const,
      drawn: false,
      pool,
    };
  });

  const rounds: [string, number][] = [
    ['Round of 16', 1],
    ['Quarter-Final', 2],
    ['Semi-Final', 3],
    ['Final', 4],
  ];
  const knock: Fixture[] = rounds.map(([r, extra], i) => {
    const spread = shuffle([-5, -1, 2, 6], rng);
    // last four: three possible opponents; the final's opponent comes from the other semi-final
    const round = new Set<string>();
    const pool = spread.slice(0, i === 2 ? 3 : i === 3 ? 1 : 4).map((sp) => cand(next(round), club.strength + boost + extra + sp));
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
  return { fixtures: [...group, ...knock], draw };
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
      // quarter-final: four balls; semi-final: three clubs left; the final is decided by the other semi
      if (names.length === (i === 1 ? 3 : i === 2 ? 1 : 4)) break;
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
  const built = opts.europe ? buildEurope(year, club, opts.europe, rng) : null;
  const eu = built?.fixtures ?? [];
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
    // the group table appears once you have drawn your group
    euroDraw: built?.draw,
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

function updateTable(table: TableRow[], fixture: Fixture, r: FixtureResult, rng: Rng, others?: OtherGame[]): TableRow[] {
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
    // Everyone else plays someone else this matchday — the result you watched live, if there was one
    const live = finalFor(others, row.id);
    if (live) {
      const [gf, ga] = live;
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (gf > ga ? 1 : 0),
        drawn: row.drawn + (gf === ga ? 1 : 0),
        lost: row.lost + (gf < ga ? 1 : 0),
        gf: row.gf + gf,
        ga: row.ga + ga,
        pts: row.pts + (gf > ga ? 3 : gf === ga ? 1 : 0),
      };
    }
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
/** The group draw: one ball from each pot decides your three opponents. */
export function applyGroupDraw(season: SeasonState, picks: number[], rng: Rng = Math.random): SeasonState {
  const t = season.tourney;
  if (!t || t.drawn) return season;
  const nt = drawGroup(t, picks, rng);
  // your three matches follow the order of the pots you drew from
  const picked = chosenByPot(t, picks);
  const byPot = t.potOrder.map((p) => nt.teams[picked[p]]);
  return {
    ...season,
    tourney: nt,
    fixtures: season.fixtures.map((f) => {
      const m = f.kind === 'tournament' ? Number(f.label.match(/Group Match (\d)/)?.[1]) : NaN;
      if (!m || f.drawn !== false) return f;
      const team = byPot[m - 1];
      return {
        ...f,
        opponent: nt.level === 'A' ? team.name : `${team.name} ${nt.level}`,
        opponentShort: team.short,
        opponentStrength: team.strength,
        drawn: true,
      };
    }),
  };
}

/** The European group draw: one club from each of the other pots makes your group. */
export function applyEuroGroupDraw(season: SeasonState, picks: number[], rng: Rng = Math.random): SeasonState {
  const d = season.euroDraw;
  if (!d || d.drawn) return season;
  const nd = drawGroup(d, picks, rng);
  const picked = chosenByPot(d, picks);
  const fixtures = season.fixtures.map((f) => {
    const m = f.kind === 'euro' && !f.knockout ? Number(f.label.match(/Group Match (\d)/)?.[1]) : NaN;
    if (!m || f.drawn !== false) return f;
    const team = nd.teams[picked[d.potOrder[m - 1]]];
    return { ...f, opponent: team.name, opponentShort: team.short, opponentStrength: team.strength, opponentColor: team.color ?? f.opponentColor, drawn: true };
  });
  const next: SeasonState = { ...season, euroDraw: nd, fixtures, euroTable: undefined };
  return { ...next, euroTable: deriveEuroTable(next) };
}

export function applyDraw(season: SeasonState, fixtureId: string, index: number, rng: Rng = Math.random): SeasonState {
  const fx = season.fixtures.find((f) => f.id === fixtureId);
  if (!fx?.pool) return season;
  const at = Math.max(0, Math.min(fx.pool.length - 1, index));
  const pick = fx.pool[at];

  // Semi-final draw: the two clubs left play the other semi-final, and its winner is your finalist
  let finalist: DrawCandidate | null = null;
  if (/Semi-Final$/.test(fx.label)) {
    const [a, b] = fx.pool.filter((_, i) => i !== at);
    if (a && b) finalist = rng() < a.opponentStrength / (a.opponentStrength + b.opponentStrength) ? a : b;
    else if (a) finalist = a;
  }
  const finalIdx = finalist ? season.fixtures.findIndex((f) => f.kind === fx.kind && /Final$/.test(f.label) && !/Semi|Quarter/.test(f.label) && f.status === 'upcoming' && f.drawn === false) : -1;

  return {
    ...season,
    fixtures: season.fixtures.map((f, i) => {
      if (f.id === fixtureId) return { ...f, ...pick, drawn: true };
      if (finalist && i === finalIdx) return { ...f, ...finalist, drawn: true, pool: [finalist] };
      return f;
    }),
  };
}

/** Results of the group: yours is real, the other two clubs play each other. */
function updateEuroTable(table: TableRow[], fixture: Fixture, r: FixtureResult, rng: Rng, liveGames?: OtherGame[]): TableRow[] {
  const slot = Number(fixture.label.match(/Group Match (\d)/)?.[1] ?? 1);
  const opp = table.filter((x) => !x.isMe)[slot - 1];
  if (!opp) return table;
  const others = table.filter((x) => !x.isMe && x.id !== opp.id);
  // the two other clubs meet on the same matchday (the score you watched, or a simulated one)
  let a = 0;
  let b = 0;
  if (others.length === 2) {
    const live = finalFor(liveGames, others[0].id);
    [a, b] = live ?? simulateScore(others[0].strength, others[1].strength, rng);
  }
  const apply = (row: TableRow, gf: number, ga: number): TableRow => ({
    ...row,
    played: row.played + 1,
    won: row.won + (gf > ga ? 1 : 0),
    drawn: row.drawn + (gf === ga ? 1 : 0),
    lost: row.lost + (gf < ga ? 1 : 0),
    gf: row.gf + gf,
    ga: row.ga + ga,
    pts: row.pts + (gf > ga ? 3 : gf === ga ? 1 : 0),
  });
  return table.map((row) => {
    if (row.isMe) return apply(row, r.myScore, r.oppScore);
    if (row.id === opp.id) return apply(row, r.oppScore, r.myScore);
    if (others.length === 2) return row.id === others[0].id ? apply(row, a, b) : apply(row, b, a);
    return row;
  });
}

/** Rebuilds the European group table (older saves, or a season where it was never created). */
export function deriveEuroTable(season: SeasonState): TableRow[] | undefined {
  if (!season.europe) return undefined;
  const me = season.table.find((r) => r.isMe);
  const group = season.fixtures.filter((f) => f.kind === 'euro' && !f.knockout);
  if (!me || group.length === 0) return undefined;
  // before the draw there is no group yet
  if (group.some((f) => f.drawn === false)) return undefined;
  let table: TableRow[] = [
    { ...me, id: 'me', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 },
    ...group.map((f, i) => ({
      id: `${season.year}-eg${i + 1}`,
      name: f.opponent,
      short: f.opponentShort,
      strength: f.opponentStrength,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    })),
  ];
  for (const f of group) {
    if (f.status === 'played' && f.result) {
      const seed = [...f.id].reduce((a, c) => a + c.charCodeAt(0), 0);
      table = updateEuroTable(table, f, f.result, mulberry32(seed));
    }
  }
  return table;
}

export function applyFixtureResult(season: SeasonState, result: FixtureResult, rng: Rng, others?: OtherGame[]): SeasonState {
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
    next.table = updateTable(season.table, fixture, result, rng, others);
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
      // saves made before the group table existed get one rebuilt from what was already played
      const base = next.euroTable ?? deriveEuroTable(season);
      if (base) next.euroTable = updateEuroTable(base, fixture, result, rng, others);
      // three group games: only the top two of the group go through
      if (fixture.label.endsWith('Group Match 3') && next.euroTable && sortTable(next.euroTable).findIndex((r) => r.isMe) >= 2) skipRest('euro');
    } else if (result.outcome === 'L') {
      skipRest('euro');
    } else if (fixture.label.endsWith(' Final')) {
      next.trophies = [...next.trophies, `${comp} ${seasonLabel(season.year)}`];
    }
  }

  if (fixture.kind === 'intl' && /Qualifier$/.test(fixture.label)) {
    next.qualPts = (season.qualPts ?? 0) + (result.outcome === 'W' ? 3 : result.outcome === 'D' ? 1 : 0);
  }

  if (fixture.kind === 'tournament' && next.tourney?.drawn) {
    let t = next.tourney;
    const out = () => {
      next.tournamentAlive = false;
      skipRest('tournament');
    };
    if (!fixture.knockout) {
      const md = Number(fixture.label.match(/Group Match (\d)/)?.[1] ?? 1);
      t = groupMatchday(t, md, opponentKey(fixture.opponent), result, rng, others);
      if (md === 3) {
        t = startKnockout(t);
        if (myGroupRank(t) < 2) {
          const qf = knockoutFixture(t, 0, season.year, rng);
          if (qf) next.fixtures = [...next.fixtures, qf];
        } else {
          t = playOut(t, rng);
          out();
        }
      }
    } else {
      const r = roundIndex(fixture.label);
      t = playRound(t, r, result, rng, others);
      if (result.outcome === 'L') {
        t = playOut(t, rng);
        out();
      } else if (r < 2) {
        const nf = knockoutFixture(t, r + 1, season.year, rng);
        if (nf) next.fixtures = [...next.fixtures, nf];
      } else {
        next.tournamentAlive = false;
        next.trophies = [...next.trophies, `${season.tournamentName} ${season.year + 1}`];
      }
    }
    next.tourney = t;
  } else if (fixture.kind === 'tournament') {
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

function nationOpponent(own: Nationality, boost: number, label: string, id: string, kind: Fixture['kind'], knockout: boolean, rng: Rng, level: NationalLevel = 'A', from?: Nationality[]): Fixture {
  // friendlies: the competitive half of the world; qualifiers: the nation's own confederation
  const pool = from?.length ? from : OPPONENT_NATIONS.filter((n) => n.code !== own.code && n.strength >= 66);
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
/** `canPick` is the national coach's decision for each selection window. */
export function queueCallUps(season: SeasonState, ovr: number, nat: Nationality, rng: Rng, age = 18, canPick: (stage: 'window' | 'tournament') => boolean = () => true): SeasonState {
  const level = nationalLevel(ovr, age);
  if (!level) return season;
  let next = season;
  const upcomingIdx = firstUpcoming(next);
  const played = next.fixtures.filter((f) => f.status === 'played').length;

  // International window mid-season
  if (!next.callUpQueued && upcomingIdx !== -1 && played >= 4 && next.fixtures.some((f) => f.kind === 'league' && f.status === 'upcoming')) {
    if (!canPick('window')) {
      next = { ...next, callUpQueued: true, callUpOmitted: true };
    } else {
    // The break brings two games: qualifiers when a tournament is coming next summer, friendlies otherwise
    const comp = level === 'A' ? tournamentFor(next.year + 1, nat) : youthTournamentFor(level, next.year + 1, nat);
    const label = comp ? `${comp} Qualifier` : 'International Friendly';
    const confed = OPPONENT_NATIONS.filter((n) => n.confederation === nat.confederation && n.code !== nat.code);
    const first = nationOpponent(nat, comp ? -3 : -1, label, `${next.year}-I1`, 'intl', false, rng, level, comp ? confed : undefined);
    const second = nationOpponent(nat, comp ? -2 : 0, label, `${next.year}-I2`, 'intl', false, rng, level, comp ? confed.filter((n) => !first.opponent.startsWith(n.name)) : OPPONENT_NATIONS.filter((n) => n.code !== nat.code && n.strength >= 66 && !first.opponent.startsWith(n.name)));
    second.home = !first.home;
    const fixtures = [...next.fixtures];
    fixtures.splice(upcomingIdx + 1, 0, first, second);
    next = { ...next, fixtures, callUpQueued: true };
    }
  }

  // Summer tournament once the domestic calendar is done
  const tournament = level === 'A' ? tournamentFor(next.year + 1, nat) : youthTournamentFor(level, next.year + 1, nat);
  const domesticLeft = next.fixtures.some((f) => f.status === 'upcoming' && (f.kind === 'league' || f.kind === 'cup' || f.kind === 'intl' || f.kind === 'euro'));
  // Reaching the summer tournament takes qualifying: stronger nations and good qualifier results help
  const qualifies = (): boolean => {
    const p = clamp(0.62 + (nat.strength - 74) / 40 + ((next.qualPts ?? 3) - 3) * 0.07, 0.12, 0.97);
    return rng() < p;
  };
  if (!next.tournamentQueued && tournament && !domesticLeft && !qualifies()) {
    next = { ...next, tournamentQueued: true, tournamentFailed: true, tournamentName: tournament };
  } else if (!next.tournamentQueued && tournament && !domesticLeft && !canPick('tournament')) {
    next = { ...next, tournamentQueued: true, tournamentOmitted: true, tournamentName: tournament };
  } else if (!next.tournamentQueued && tournament && !domesticLeft) {
    const { tourney, fixtures: groupFixtures } = createTournament(tournament, nat, level, next.year, rng);
    next = {
      ...next,
      fixtures: [...next.fixtures, ...groupFixtures],
      tournamentQueued: true,
      tournamentAlive: true,
      tournamentName: tournament,
      tourney,
    };
  }
  next.cursor = firstUpcoming(next) === -1 ? next.fixtures.length : firstUpcoming(next);
  return next;
}

export function describeClub(id: string | null) {
  const c = getClub(id);
  return c ? `${c.name} · ${c.league}` : 'Free agent';
}
