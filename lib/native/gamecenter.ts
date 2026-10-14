import { registerPlugin } from '@capacitor/core';
import { useArchiveStore } from '../archive';
import { useGameStore } from '../store';
import { ACH_PREFIX, ACHIEVEMENTS, collectStats } from './achievementList';

/** The leaderboard created in App Store Connect (Game Center): total goals, every career on this phone. */
export const GOALS_BOARD = 'com.ben34110.pitchlegacy.goals';

interface GameCenterPlugin {
  signIn(): Promise<{ signedIn: boolean }>;
  submitScore(o: { leaderboardId: string; score: number }): Promise<{ submitted: boolean }>;
  showLeaderboard(o: { leaderboardId: string }): Promise<{ shown: boolean; reason?: string; detail?: string }>;
  reportAchievement(o: { id: string; percent: number }): Promise<{ reported: boolean }>;
  showAchievements(): Promise<{ shown: boolean; reason?: string }>;
}

/** Implemented in Swift (ios/App/App/GameCenterPlugin.swift). */
const GameCenter = registerPlugin<GameCenterPlugin>('GameCenter');

/** Every goal scored in every career on this phone: the careers filed away plus the one being played. */
export function totalGoals(): number {
  const key = (careerId: string | undefined, name: string, apps: number, seasons: number) => careerId ?? `${name}|${apps}|${seasons}`;
  const goals = new Map<string, number>();
  const put = (k: string, n: number) => goals.set(k, Math.max(goals.get(k) ?? 0, n));
  for (const c of useArchiveStore.getState().careers) put(key(c.player.careerId, c.player.name, c.player.totals.apps, c.history.length), c.player.totals.goals);
  const { player, history } = useGameStore.getState();
  if (player) put(key(player.careerId, player.name, player.totals.apps, history.length), player.totals.goals);
  let total = 0;
  goals.forEach((n) => (total += n));
  return total;
}

let signedIn = false;
let lastSent = -1;

const ACH_KEY = 'fcs-gc-ach-v1';

/** Tells Game Center how far each achievement is (only what moved since the last time). */
async function reportAchievements() {
  if (!signedIn) return;
  let done: Record<string, number> = {};
  try {
    done = JSON.parse(window.localStorage.getItem(ACH_KEY) ?? '{}') as Record<string, number>;
  } catch {
    done = {};
  }
  const g = useGameStore.getState();
  const stats = collectStats(
    useArchiveStore.getState().careers.map((c) => ({ player: c.player, history: c.history, retired: c.retired })),
    g.player ? { player: g.player, history: g.history, retired: g.phase === 'retired' } : null,
  );
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    const percent = Math.round(a.progress(stats) * 100);
    if (percent <= (done[a.id] ?? 0)) continue;
    try {
      const r = await GameCenter.reportAchievement({ id: ACH_PREFIX + a.id, percent });
      if (r.reported) {
        done[a.id] = percent;
        changed = true;
      }
    } catch {
      /* sent again at the next change */
    }
  }
  if (changed) {
    try {
      window.localStorage.setItem(ACH_KEY, JSON.stringify(done));
    } catch {
      /* private mode */
    }
  }
}

async function send() {
  if (!signedIn) return;
  void reportAchievements();
  const score = totalGoals();
  if (score <= 0 || score === lastSent) return;
  try {
    const r = await GameCenter.submitScore({ leaderboardId: GOALS_BOARD, score });
    if (r.submitted) lastSent = score;
  } catch {
    /* no network or not set up yet: it is sent again at the next change */
  }
}

/** Signs in to Game Center (the system asks only once) and keeps the leaderboard up to date with the goals scored. */
export async function initGameCenter() {
  try {
    signedIn = (await GameCenter.signIn()).signedIn;
  } catch {
    signedIn = false;
  }
  if (!signedIn) return;
  void send();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void send(), 4000);
  };
  useGameStore.subscribe(later);
  useArchiveStore.subscribe(later);
}

/** Opens the Game Center achievements. */
export async function showAchievementList(): Promise<LeaderboardResult> {
  try {
    void reportAchievements();
    const r = await GameCenter.showAchievements();
    if (r.shown) return { ok: true };
    return { ok: false, reason: r.reason === 'not-signed-in' ? 'not-signed-in' : 'error', detail: r.reason ?? '' };
  } catch (e) {
    return { ok: false, reason: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
}

export type LeaderboardResult = { ok: true } | { ok: false; reason: 'not-signed-in' | 'error'; detail: string };

/** Opens the Game Center leaderboard; says why when it could not (not signed in, or the plugin / Game Center refused). */
export async function showGoalsLeaderboard(): Promise<LeaderboardResult> {
  try {
    // never rely on a sign-in made earlier: the native side checks again and waits for it
    void send();
    const r = await GameCenter.showLeaderboard({ leaderboardId: GOALS_BOARD });
    if (r.shown) {
      signedIn = true;
      return { ok: true };
    }
    return { ok: false, reason: r.reason === 'not-signed-in' ? 'not-signed-in' : 'error', detail: r.detail ?? r.reason ?? '' };
  } catch (e) {
    return { ok: false, reason: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
}
