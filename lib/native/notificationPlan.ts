import { translate } from '../i18n';
import { MAX_BOLTS, REGEN_MS, seasonLabel, syncEnergy, unlimitedMsLeft } from '../engine/player';
import type { Player, SeasonState } from '../types';

/**
 * What to remind the player of, and when. Pure (no Capacitor): the native layer only schedules what this returns.
 *
 *  - lives: once, when the lives are full again — only after a real session (3+ lives spent) and at most 3 a day;
 *  - inactivity: 24 h, 3 days and 7 days after the last time the game was open, then nothing more.
 * Nothing is sent between 22:00 and 09:00: such a reminder is moved to 09:00.
 */
export interface PlannedNotification {
  id: number;
  at: number;
  body: string;
  kind: 'lives' | 'idle';
}

export const NOTIF_TITLE = 'Ultime Player';
export const LIVES_ID = 1;
export const IDLE_IDS = [11, 12, 13];
const DAY = 24 * 3600 * 1000;
export const MAX_LIVES_PINGS_PER_DAY = 3;

/** Message templates are the English keys of the dictionary: `{name}`, `{first}`, `{club}`, `{season}`, `{left}`, `{goals}`. */
const LIVES_MESSAGES = [
  'Lives full! {name} is ready for the next match.',
  '5/5: the dressing room is waiting for you, {first}.',
  'Your lives are back. One more match towards legend?',
  'Kick-off is near: you have all your lives back.',
  'The coach put your shirt on the bench. All your lives are back.',
  'Full of energy! Chain the matches together.',
  '{club} needs you: your 5 lives are back.',
];

interface IdleMessage {
  text: string;
  needs?: 'left' | 'goals';
}

const IDLE_MESSAGES: IdleMessage[][] = [
  [{ text: '{name} is waiting for the next match at {club}.' }, { text: 'The Golden Star is not won on the bench, {first}.' }],
  [{ text: 'Scouts are starting to forget you. Come back and write your legend.' }, { text: 'Season {season}: {left} matches to go. Offers will not wait.', needs: 'left' }],
  [
    { text: '{first} has not played for a week. Their agent is worried.' },
    { text: 'A rival has just scored in the Golden Star race. And you?' },
    { text: '{goals} goals this season: that deserves better than a touchline.', needs: 'goals' },
  ],
];

/** Quiet hours: 22:00 → 09:00 local time. */
export function outsideQuietHours(at: number): number {
  const d = new Date(at);
  const h = d.getHours();
  if (h >= 22) {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else if (h < 9) {
    d.setHours(9, 0, 0, 0);
  }
  return d.getTime();
}

export interface PlanInput {
  now: number;
  player: Player | null;
  season: SeasonState | null;
  year: number;
  clubName: string;
  retired: boolean;
  /** Fire times of the lives reminders already planned in the last 24 h */
  recentLivesFires: number[];
}

export function planNotifications(i: PlanInput): { items: PlannedNotification[]; livesFires: number[] } {
  const { now, player } = i;
  const livesFires = i.recentLivesFires.filter((t) => t > now - DAY);
  if (!player || i.retired) return { items: [], livesFires };

  const upcoming = i.season ? i.season.fixtures.filter((f) => f.status === 'upcoming').length : 0;
  const goals = i.season?.stats.goals ?? 0;
  const vars = {
    name: player.name,
    first: player.name.split(' ')[0] ?? player.name,
    club: i.clubName,
    season: seasonLabel(i.year),
    left: upcoming,
    goals,
  };
  const say = (text: string) => translate(text, vars);
  const items: PlannedNotification[] = [];

  // lives are full again
  if (unlimitedMsLeft(player, now) <= 0) {
    const e = syncEnergy(player.energy, now);
    if (e.bolts <= MAX_BOLTS - 3) {
      const full = outsideQuietHours(e.at + (MAX_BOLTS - e.bolts) * REGEN_MS);
      if (full > now + 5000) {
        const same = livesFires.some((t) => Math.abs(t - full) < 60_000);
        if (same || livesFires.length < MAX_LIVES_PINGS_PER_DAY) {
          if (!same) livesFires.push(full);
          items.push({ id: LIVES_ID, at: full, kind: 'lives', body: say(LIVES_MESSAGES[Math.floor(full / 60_000) % LIVES_MESSAGES.length]) });
        }
      }
    }
  }

  // nobody came back
  const dayIndex = Math.floor(now / DAY);
  [1, 3, 7].forEach((days, k) => {
    const pool = IDLE_MESSAGES[k].filter((m) => (m.needs === 'left' ? upcoming > 0 : m.needs === 'goals' ? goals > 0 : true));
    if (!pool.length) return;
    const msg = pool[(dayIndex + k) % pool.length];
    items.push({ id: IDLE_IDS[k], at: outsideQuietHours(now + days * DAY), kind: 'idle', body: say(msg.text) });
  });

  return { items, livesFires };
}
