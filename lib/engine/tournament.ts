import { NATIONALITIES } from '../data/nationalities';
import type { DrawCandidate, Fixture, FixtureResult, Nationality, TableRow, TournamentState, TournamentTeam, TournamentTie } from '../types';
import { simulateScore } from './livefeed';
import { LEVEL_STRENGTH, type NationalLevel } from './player';
import { clamp, rand, shuffle, type Rng } from './rng';

const ROUND_LABELS = ['Quarter-Final', 'Semi-Final', 'Final'];
/** Round-robin order of a four-team group (indices into the group) */
const SCHEDULE: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

const stripLevel = (name: string) => name.replace(/ (U20|U23)$/, '');

/**
 * Who can play this tournament: the nations of its confederation (`core`), and the guests
 * (strongest first) invited when the confederation is short of teams.
 */
export function tournamentField(name: string, me: Nationality): { core: Nationality[]; guests: Nationality[] } {
  const byStrength = (list: Nationality[]) => [...list].sort((a, b) => b.strength - a.strength);
  const of = (c: Nationality['confederation']) => NATIONALITIES.filter((n) => n.confederation === c);
  let core: Nationality[];
  let invited: Nationality[] = [];
  if (/World Cup|Olympic/.test(name)) core = NATIONALITIES;
  else if (/European/.test(name)) core = of('UEFA');
  else if (/Africa/.test(name)) core = of('CAF');
  else if (/Asian/.test(name)) core = of('AFC');
  else if (/Copa/.test(name)) {
    core = of('CONMEBOL');
    invited = byStrength(of('CONCACAF'));
  } else if (/Gold/.test(name)) {
    core = of('CONCACAF');
    invited = byStrength(of('CONMEBOL'));
  } else core = of(me.confederation);
  const have = new Set([...core, ...invited].map((n) => n.code));
  const guests = [...invited, ...byStrength(NATIONALITIES.filter((n) => !have.has(n.code)))].filter((n) => n.code !== me.code);
  return { core: core.filter((n) => n.code !== me.code), guests };
}

function tableRow(name: string, team: TournamentTeam, isMe: boolean): TableRow {
  return { id: name, name, short: team.short, strength: team.strength, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0, isMe };
}

export const rankGroup = (rows: TableRow[]): TableRow[] =>
  [...rows].sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || b.strength - a.strength || a.name.localeCompare(b.name));

const candidate = (t: TournamentState, name: string): DrawCandidate => ({
  opponent: t.level === 'A' ? name : `${name} ${t.level}`,
  opponentShort: t.teams[name].short,
  opponentStrength: t.teams[name].strength,
  opponentColor: '#fbbf24',
});

/** Builds the field, the three pots and your three (still undrawn) group matches. */
export function createTournament(name: string, me: Nationality, level: NationalLevel, year: number, rng: Rng): { tourney: TournamentState; fixtures: Fixture[] } {
  const teams: Record<string, TournamentTeam> = {};
  const strengthOf = (n: Nationality) => clamp(Math.round(n.strength + LEVEL_STRENGTH[level] + rand(-2, 2, rng)), 50, 95);
  teams[me.name] = { name: me.name, short: `${me.flag} ${me.code}`, strength: strengthOf(me) };
  // the strongest nations usually qualify, with the odd surprise; guests only fill the empty places
  const { core, guests } = tournamentField(name, me);
  const noisy = core
    .map((n) => ({ n, k: n.strength + rand(-6, 6, rng) }))
    .sort((a, b) => b.k - a.k)
    .map(({ n }) => n);
  const others = [...noisy.slice(0, 15), ...guests].slice(0, 15);
  others.forEach((n) => (teams[n.name] = { name: n.name, short: `${n.flag} ${n.code}`, strength: strengthOf(n) }));
  const sorted = others.map((n) => n.name).sort((a, b) => teams[b].strength - teams[a].strength);
  const pots = [sorted.slice(0, 5), sorted.slice(5, 10), sorted.slice(10, 15)];
  const potOrder = shuffle([0, 1, 2], rng);

  const tourney: TournamentState = { level, teams, me: me.name, pots, potOrder, drawn: false, groups: [], myGroup: 0, rounds: [] };
  const fixtures: Fixture[] = potOrder.map((p, i) => {
    const pool = pots[p].map((n) => candidate(tourney, n));
    return {
      id: `${year}-T${i + 1}`,
      kind: 'tournament' as const,
      label: `Group Match ${i + 1}`,
      ...pool[0],
      home: i !== 1,
      knockout: false,
      status: 'upcoming' as const,
      drawn: false,
      pool,
      level: level === 'A' ? undefined : level,
    };
  });
  return { tourney, fixtures };
}

/** You pick one ball from each pot: the group is made, the other three groups are dealt. */
export function drawGroup(t: TournamentState, picks: number[], rng: Rng): TournamentState {
  const chosen = t.potOrder.map((p, i) => t.pots[p][Math.max(0, Math.min(t.pots[p].length - 1, picks[i] ?? 0))]);
  const mine = [t.me, ...chosen];
  const rest = shuffle(
    t.pots.flat().filter((n) => !chosen.includes(n)),
    rng,
  ).sort((a, b) => t.teams[b].strength - t.teams[a].strength);
  // deal the rest in turn so the three other groups are balanced
  const dealt: string[][] = [[], [], []];
  rest.forEach((n, i) => dealt[i % 3].push(n));
  const myGroup = Math.floor(rng() * 4);
  const groups: TableRow[][] = [];
  let d = 0;
  for (let g = 0; g < 4; g++) {
    const members = g === myGroup ? mine : dealt[d++];
    groups.push(members.map((n) => tableRow(n, t.teams[n], n === t.me)));
  }
  return { ...t, drawn: true, groups, myGroup };
}

function applyScore(rows: TableRow[], a: string, ga: number, b: string, gb: number): TableRow[] {
  const upd = (r: TableRow, gf: number, against: number): TableRow => ({
    ...r,
    played: r.played + 1,
    won: r.won + (gf > against ? 1 : 0),
    drawn: r.drawn + (gf === against ? 1 : 0),
    lost: r.lost + (gf < against ? 1 : 0),
    gf: r.gf + gf,
    ga: r.ga + against,
    pts: r.pts + (gf > against ? 3 : gf === against ? 1 : 0),
  });
  return rows.map((r) => (r.name === a ? upd(r, ga, gb) : r.name === b ? upd(r, gb, ga) : r));
}

/** Your group match is played; every other group match of the same matchday is played too. */
export function groupMatchday(t: TournamentState, matchday: number, opponent: string, result: FixtureResult, rng: Rng): TournamentState {
  const md = clamp(matchday, 1, 3) - 1;
  const groups = t.groups.map((rows, g) => {
    let next = rows;
    if (g === t.myGroup) {
      next = applyScore(next, t.me, result.myScore, opponent, result.oppScore);
      const rest = rows.filter((r) => r.name !== t.me && r.name !== opponent);
      if (rest.length === 2) {
        const [x, y] = simulateScore(rest[0].strength, rest[1].strength, rng);
        next = applyScore(next, rest[0].name, x, rest[1].name, y);
      }
      return next;
    }
    for (const [i, j] of SCHEDULE[md]) {
      const [x, y] = simulateScore(rows[i].strength, rows[j].strength, rng);
      next = applyScore(next, rows[i].name, x, rows[j].name, y);
    }
    return next;
  });
  return { ...t, groups };
}

const tie = (a: string, b: string): TournamentTie => ({ a, b });

/** Group stage over: top two of each group meet in the quarter-finals. */
export function startKnockout(t: TournamentState): TournamentState {
  const r = t.groups.map((g) => rankGroup(g).map((x) => x.name));
  const qf = [tie(r[0][0], r[1][1]), tie(r[1][0], r[0][1]), tie(r[2][0], r[3][1]), tie(r[3][0], r[2][1])];
  return {
    ...t,
    rounds: [
      { label: ROUND_LABELS[0], ties: qf },
      { label: ROUND_LABELS[1], ties: [tie('', ''), tie('', '')] },
      { label: ROUND_LABELS[2], ties: [tie('', '')] },
    ],
  };
}

export const myGroupRank = (t: TournamentState) => rankGroup(t.groups[t.myGroup]).findIndex((r) => r.name === t.me);

function playTie(t: TournamentState, x: TournamentTie, rng: Rng): TournamentTie {
  let [ga, gb] = simulateScore(t.teams[x.a].strength, t.teams[x.b].strength, rng);
  let pens: [number, number] | undefined;
  if (ga === gb) {
    const pa = t.teams[x.a].strength / (t.teams[x.a].strength + t.teams[x.b].strength);
    const aWins = rng() < pa;
    const hi = 3 + Math.floor(rng() * 3);
    const lo = Math.max(1, hi - 1 - Math.floor(rng() * 2));
    pens = aWins ? [hi, lo] : [lo, hi];
  }
  const winner = ga > gb ? x.a : gb > ga ? x.b : pens![0] > pens![1] ? x.a : x.b;
  return { ...x, ga, gb, pens, winner };
}

/**
 * Plays a round: your tie takes your real result (when there is one), every other tie is simulated,
 * and the next round's pairings are filled in from the winners.
 */
export function playRound(t: TournamentState, round: number, mine: FixtureResult | null, rng: Rng): TournamentState {
  const rounds = t.rounds.map((r) => ({ ...r, ties: [...r.ties] }));
  rounds[round].ties = rounds[round].ties.map((x) => {
    if (x.winner || !x.a || !x.b) return x;
    if (mine && (x.a === t.me || x.b === t.me)) {
      const meIsA = x.a === t.me;
      const ga = meIsA ? mine.myScore : mine.oppScore;
      const gb = meIsA ? mine.oppScore : mine.myScore;
      const pens: [number, number] | undefined = mine.shootout ? (meIsA ? [mine.shootout.my, mine.shootout.opp] : [mine.shootout.opp, mine.shootout.my]) : undefined;
      const meWon = mine.outcome === 'W';
      return { ...x, ga, gb, pens, winner: meWon ? t.me : meIsA ? x.b : x.a };
    }
    return playTie(t, x, rng);
  });
  if (round + 1 < rounds.length) {
    const w = rounds[round].ties.map((x) => x.winner ?? '');
    rounds[round + 1].ties = rounds[round + 1].ties.map((x, i) => ({ ...x, a: w[2 * i] ?? '', b: w[2 * i + 1] ?? '' }));
  }
  const final = rounds[rounds.length - 1].ties[0];
  return { ...t, rounds, champion: final?.winner ?? t.champion };
}

/** You are out: the rest of the tournament is played so the bracket is complete. */
export function playOut(t: TournamentState, rng: Rng): TournamentState {
  let next = t;
  if (!next.rounds.length) next = startKnockout(next);
  for (let r = 0; r < next.rounds.length; r++) {
    if (next.rounds[r].ties.some((x) => !x.winner && x.a && x.b)) next = playRound(next, r, null, rng);
  }
  return next;
}

export const roundIndex = (label: string) => ROUND_LABELS.indexOf(label);

/** Your fixture for a knockout round, with the opponent already known from the bracket. */
export function knockoutFixture(t: TournamentState, round: number, year: number, rng: Rng): Fixture | null {
  const x = t.rounds[round]?.ties.find((y) => y.a === t.me || y.b === t.me);
  if (!x) return null;
  const opp = x.a === t.me ? x.b : x.a;
  const c = candidate(t, opp);
  return {
    id: `${year}-T${4 + round}`,
    kind: 'tournament',
    label: ROUND_LABELS[round],
    ...c,
    home: rng() < 0.5,
    knockout: true,
    status: 'upcoming',
    drawn: true,
    level: t.level === 'A' ? undefined : t.level,
  };
}

export const opponentKey = stripLevel;
