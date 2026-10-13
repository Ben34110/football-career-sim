import { registerPlugin } from '@capacitor/core';
import { useArchiveStore } from '../archive';
import { useGameStore } from '../store';

/** The leaderboard created in App Store Connect (Game Center): total goals, every career on this phone. */
export const GOALS_BOARD = 'com.ben34110.pitchlegacy.goals';

interface GameCenterPlugin {
  signIn(): Promise<{ signedIn: boolean }>;
  submitScore(o: { leaderboardId: string; score: number }): Promise<{ submitted: boolean }>;
  showLeaderboard(o: { leaderboardId: string }): Promise<{ shown: boolean }>;
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

async function send() {
  if (!signedIn) return;
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

/** Opens the Game Center leaderboard; false when the player is not signed in to Game Center. */
export async function showGoalsLeaderboard(): Promise<boolean> {
  try {
    if (!signedIn) signedIn = (await GameCenter.signIn()).signedIn;
    if (!signedIn) return false;
    await send();
    return (await GameCenter.showLeaderboard({ leaderboardId: GOALS_BOARD })).shown;
  } catch {
    return false;
  }
}
