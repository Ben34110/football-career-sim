import type { Player, SeasonRecord } from '../types';

/**
 * The Game Center achievements: what they need, and how far a set of careers is towards each one. Pure (no Capacitor),
 * so it can be tested. The ids are the ones created in App Store Connect.
 */
export const ACH_PREFIX = 'com.ben34110.pitchlegacy.ach.';

export interface CareerStats {
  goals: number;
  apps: number;
  transfers: number;
  caps: number;
  retired: number;
  trophies: string[];
  redCard: boolean;
  sacked: boolean;
}

export interface AchievementDef {
  id: string;
  /** English name and the two descriptions (before / after unlocking), as typed in App Store Connect */
  name: string;
  how: string;
  done: string;
  points: number;
  hidden?: boolean;
  /** 0…1: how far the careers on the phone are */
  progress: (s: CareerStats) => number;
}

const ratio = (v: number, target: number) => Math.max(0, Math.min(1, v / target));
const has = (s: CareerStats, re: RegExp) => s.trophies.some((t) => re.test(t));

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'goals_10', name: 'Off the mark', how: 'Score 10 goals.', done: 'You scored 10 goals.', points: 10, progress: (s) => ratio(s.goals, 10) },
  { id: 'goals_50', name: 'Proven finisher', how: 'Score 50 goals.', done: 'You scored 50 goals.', points: 20, progress: (s) => ratio(s.goals, 50) },
  { id: 'goals_100', name: 'Centurion', how: 'Score 100 goals.', done: 'You scored 100 goals.', points: 30, progress: (s) => ratio(s.goals, 100) },
  { id: 'goals_250', name: 'Goal machine', how: 'Score 250 goals.', done: 'You scored 250 goals.', points: 50, progress: (s) => ratio(s.goals, 250) },
  { id: 'goals_500', name: 'Goal legend', how: 'Score 500 goals.', done: 'You scored 500 goals.', points: 100, progress: (s) => ratio(s.goals, 500) },
  { id: 'apps_100', name: 'Regular', how: 'Play 100 matches.', done: 'You played 100 matches.', points: 20, progress: (s) => ratio(s.apps, 100) },
  { id: 'apps_500', name: 'Iron man', how: 'Play 500 matches.', done: 'You played 500 matches.', points: 50, progress: (s) => ratio(s.apps, 500) },
  { id: 'first_trophy', name: 'First silverware', how: 'Win a trophy.', done: 'You won your first trophy.', points: 20, progress: (s) => (s.trophies.length > 0 ? 1 : 0) },
  { id: 'league_title', name: 'Champion', how: 'Win a league title.', done: 'You won a league title.', points: 20, progress: (s) => (has(s, /^League Title/) ? 1 : 0) },
  { id: 'continental_cup', name: 'Continental glory', how: 'Win a continental club cup.', done: 'You won a continental club cup.', points: 40, progress: (s) => (has(s, /^(Europe|Africa|South America|Asia|North America) (Elite|Challenge) Cup/) ? 1 : 0) },
  { id: 'golden_star', name: 'Golden Star', how: 'Win the Golden Star.', done: 'You won the Golden Star.', points: 100, progress: (s) => (has(s, /^Golden Star/) ? 1 : 0) },
  { id: 'first_cap', name: 'Called up', how: 'Play for your national team.', done: 'You played for your national team.', points: 20, progress: (s) => (s.caps > 0 ? 1 : 0) },
  { id: 'caps_50', name: 'Fifty caps', how: 'Play 50 matches for your national team.', done: 'You played 50 matches for your national team.', points: 30, progress: (s) => ratio(s.caps, 50) },
  { id: 'world_cup', name: 'World champion', how: 'Win the World Nations Cup.', done: 'You won the World Nations Cup.', points: 100, progress: (s) => (has(s, /^World Nations Cup \d{4}$/) ? 1 : 0) },
  { id: 'first_transfer', name: 'New colours', how: 'Change club for the first time.', done: 'You changed club for the first time.', points: 10, progress: (s) => (s.transfers > 0 ? 1 : 0) },
  { id: 'transfers_4', name: 'Globetrotter', how: 'Change club 4 times.', done: 'You changed club 4 times.', points: 20, progress: (s) => ratio(s.transfers, 4) },
  { id: 'retired', name: 'Hanging up the boots', how: 'Take a career all the way to retirement.', done: 'You finished a career.', points: 50, progress: (s) => (s.retired > 0 ? 1 : 0) },
  { id: 'red_card', name: 'Early bath', how: 'Get sent off.', done: 'You were sent off.', points: 10, hidden: true, progress: (s) => (s.redCard ? 1 : 0) },
  { id: 'sacked', name: 'Shown the door', how: 'Get sacked by your club.', done: 'Your club terminated your contract.', points: 10, hidden: true, progress: (s) => (s.sacked ? 1 : 0) },
];

/** What the careers on the phone add up to: the ones filed away, plus the one being played (counted once). */
export function collectStats(archived: { player: Player; history: SeasonRecord[]; retired: boolean }[], current: { player: Player; history: SeasonRecord[]; retired: boolean } | null): CareerStats {
  const byCareer = new Map<string, { player: Player; retired: boolean }>();
  const key = (p: Player, seasons: number) => p.careerId ?? `${p.name}|${p.totals.apps}|${seasons}`;
  for (const c of archived) byCareer.set(key(c.player, c.history.length), { player: c.player, retired: c.retired });
  if (current) {
    const k = key(current.player, current.history.length);
    const before = byCareer.get(k);
    // the same career filed again with more in it: the running one is the latest
    byCareer.set(k, { player: current.player, retired: current.retired || !!before?.retired });
  }
  const s: CareerStats = { goals: 0, apps: 0, transfers: 0, caps: 0, retired: 0, trophies: [], redCard: false, sacked: false };
  byCareer.forEach(({ player, retired }) => {
    s.goals += player.totals.goals;
    s.apps += player.totals.apps;
    s.transfers += player.totals.transfers;
    s.caps += (player.national?.caps ?? 0) + (player.national?.youthCaps ?? 0);
    if (retired) s.retired++;
    s.trophies.push(...player.trophies);
    if (player.firsts?.redCard) s.redCard = true;
    if (player.firsts?.sacked) s.sacked = true;
  });
  return s;
}
