import { CLUBS } from '../data/clubs';
import { OPPONENT_NATIONS } from '../data/nationalities';
import type { Fixture, SeasonState, TableRow } from '../types';
import { clamp, randInt, shuffle, type Rng } from './rng';

/** A match played at the same time as yours. */
export interface OtherGame {
  id: string;
  homeId: string;
  awayId: string;
  home: string;
  away: string;
  homeShort: string;
  awayShort: string;
  /** Goals in order, with the minute they are scored */
  goals: { minute: number; side: 'h' | 'a' }[];
  final: [number, number];
  /** true: this game feeds the table you are watching, so its result is kept */
  table: boolean;
}

export function simulateScore(sa: number, sb: number, rng: Rng): [number, number] {
  const pa = clamp(0.4 + (sa - sb) / 70, 0.12, 0.72);
  const roll = rng();
  const outcome = roll < pa ? 'A' : roll < pa + 0.24 ? 'D' : 'B';
  let a = outcome === 'A' ? randInt(1, 3, rng) : outcome === 'D' ? randInt(0, 2, rng) : randInt(0, 1, rng);
  let b = outcome === 'B' ? randInt(1, 3, rng) : outcome === 'D' ? a : randInt(0, Math.max(0, a - 1), rng);
  if (outcome === 'A' && b >= a) b = Math.max(0, a - 1);
  if (outcome === 'B' && a >= b) a = Math.max(0, b - 1);
  return [a, b];
}

function makeGame(id: string, homeId: string, awayId: string, home: [string, string, number], away: [string, string, number], table: boolean, rng: Rng): OtherGame {
  const final = simulateScore(home[2], away[2], rng);
  const goals = [
    ...Array.from({ length: final[0] }, () => ({ minute: randInt(2, 89, rng), side: 'h' as const })),
    ...Array.from({ length: final[1] }, () => ({ minute: randInt(2, 89, rng), side: 'a' as const })),
  ].sort((x, y) => x.minute - y.minute);
  return { id, homeId, awayId, home: home[0], away: away[0], homeShort: home[1], awayShort: away[1], goals, final, table };
}

export function scoreAt(g: OtherGame, minute: number): [number, number] {
  let h = 0;
  let a = 0;
  for (const x of g.goals) if (x.minute <= minute) x.side === 'h' ? h++ : a++;
  return [h, a];
}

const shortOf = (name: string) => name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean).slice(-1)[0]?.slice(0, 3).toUpperCase() ?? '???';

/** The games being played while yours is on: real table games, or flavour for knockouts. */
export function buildOtherGames(season: SeasonState, fixture: Fixture, rng: Rng): OtherGame[] {
  if (fixture.kind === 'league') {
    const rows = shuffle(season.table.filter((r) => !r.isMe && r.name !== fixture.opponent), rng);
    const games: OtherGame[] = [];
    for (let i = 0; i + 1 < rows.length; i += 2) {
      const [h, a] = rng() < 0.5 ? [rows[i], rows[i + 1]] : [rows[i + 1], rows[i]];
      games.push(makeGame(`lg${i}`, h.id, a.id, [h.name, h.short, h.strength], [a.name, a.short, a.strength], true, rng));
    }
    return games;
  }
  if (fixture.kind === 'euro' && !fixture.knockout && season.euroTable) {
    const rows = season.euroTable.filter((r) => !r.isMe && r.name !== fixture.opponent);
    if (rows.length === 2) return [makeGame('eg', rows[0].id, rows[1].id, [rows[0].name, rows[0].short, rows[0].strength], [rows[1].name, rows[1].short, rows[1].strength], true, rng)];
    return [];
  }
  // knockouts and internationals: other ties going on elsewhere (flavour only)
  const names: [string, string][] =
    fixture.kind === 'tournament' || fixture.kind === 'intl'
      ? shuffle(OPPONENT_NATIONS, rng).map((n) => [n.name, n.code] as [string, string])
      : fixture.kind === 'euro'
        ? shuffle(CLUBS.filter((c) => c.tier <= 3), rng).map((c) => [c.name, c.short] as [string, string])
        : shuffle(season.table, rng).map((r) => [r.name, r.short] as [string, string]);
  const pool = names.filter(([n]) => n !== fixture.opponent && !season.table.some((r) => r.isMe && r.name === n));
  const games: OtherGame[] = [];
  for (let i = 0; i < 3 && i * 2 + 1 < pool.length; i++) {
    const a = pool[i * 2];
    const b = pool[i * 2 + 1];
    games.push(makeGame(`ot${i}`, `x${i}a`, `x${i}b`, [a[0], a[1] || shortOf(a[0]), 60 + randInt(0, 22, rng)], [b[0], b[1] || shortOf(b[0]), 60 + randInt(0, 22, rng)], false, rng));
  }
  return games;
}

const bump = (row: TableRow, gf: number, ga: number): TableRow => ({
  ...row,
  played: row.played + 1,
  won: row.won + (gf > ga ? 1 : 0),
  drawn: row.drawn + (gf === ga ? 1 : 0),
  lost: row.lost + (gf < ga ? 1 : 0),
  gf: row.gf + gf,
  ga: row.ga + ga,
  pts: row.pts + (gf > ga ? 3 : gf === ga ? 1 : 0),
});

/** The table as it would stand if the games ended now. */
export function liveTable(table: TableRow[], opponentName: string, myScore: number, oppScore: number, games: OtherGame[], minute: number): TableRow[] {
  return table.map((row) => {
    if (row.isMe) return bump(row, myScore, oppScore);
    if (row.name === opponentName) return bump(row, oppScore, myScore);
    const g = games.find((x) => x.table && (x.homeId === row.id || x.awayId === row.id));
    if (!g) return row;
    const [h, a] = scoreAt(g, minute);
    return row.id === g.homeId ? bump(row, h, a) : bump(row, a, h);
  });
}

/** Result of the game that involves this row, if it was simulated for the live view. */
export function finalFor(games: OtherGame[] | undefined, rowId: string): [number, number] | null {
  const g = games?.find((x) => x.table && (x.homeId === rowId || x.awayId === rowId));
  if (!g) return null;
  return g.homeId === rowId ? g.final : [g.final[1], g.final[0]];
}
