import type { Fixture, SeasonState, TableRow } from '../types';
import { deriveEuroTable, sortTable } from './season';
import { rankGroup } from './tournament';

export interface Standing {
  rank: number;
  pts: number;
}

const find = (rows: TableRow[], pick: (r: TableRow) => boolean): Standing | null => {
  const i = rows.findIndex(pick);
  // before a side has played, its place in the table means nothing yet
  return i === -1 || rows[i].played === 0 ? null : { rank: i + 1, pts: rows[i].pts };
};

/**
 * Where both sides stand in the table that matters for this fixture:
 * the league (also for cup ties against a league rival), the European group, or the tournament group.
 */
export function standingsFor(season: SeasonState | null, fixture: Fixture): { me: Standing | null; opp: Standing | null } {
  if (!season) return { me: null, opp: null };
  const opp = fixture.opponent.replace(/ (U20|U23)$/, '');
  const tab = (rows: TableRow[], sort: (r: TableRow[]) => TableRow[] = sortTable) => {
    const s = sort(rows);
    return { me: find(s, (r) => !!r.isMe), opp: find(s, (r) => r.name === opp) };
  };
  if (fixture.kind === 'tournament' && season.tourney?.drawn && !fixture.knockout) return tab(season.tourney.groups[season.tourney.myGroup], rankGroup);
  if (fixture.kind === 'euro' && !fixture.knockout) {
    const t = season.euroTable ?? deriveEuroTable(season);
    return t ? tab(t) : { me: null, opp: null };
  }
  if (fixture.kind === 'league' || fixture.kind === 'cup') return tab(season.table);
  return { me: null, opp: null };
}

/**
 * The opponent's record in the table that counts for this fixture (league, European group or tournament group),
 * once they have played in it. The scouts use it to say how the side has really been doing.
 */
export function oppRecordFor(season: SeasonState | null, fixture: Fixture): TableRow | undefined {
  if (!season) return undefined;
  const opp = fixture.opponent.replace(/ (U20|U23)$/, '');
  let rows: TableRow[] | undefined;
  if (fixture.kind === 'tournament' && season.tourney?.drawn && !fixture.knockout) rows = season.tourney.groups[season.tourney.myGroup];
  else if (fixture.kind === 'euro' && !fixture.knockout) rows = season.euroTable ?? deriveEuroTable(season);
  else if (fixture.kind === 'league' || fixture.kind === 'cup') rows = season.table;
  const row = rows?.find((r) => r.name === opp);
  return row && row.played > 0 ? row : undefined;
}
