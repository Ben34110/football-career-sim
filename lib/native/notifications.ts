import { LocalNotifications } from '@capacitor/local-notifications';
import { useArchiveStore } from '../archive';
import { getClub } from '../data/clubs';
import { useGameStore } from '../store';
import { NOTIF_TITLE, planNotifications } from './notificationPlan';

/**
 * Local notifications (iPhone app): "your lives are full again" and gentle nudges after a few days away.
 * Everything is scheduled on the phone — no server. Opt-in: nothing is scheduled until the player says yes.
 */
const ON = 'fcs-notifs';
const ASKED = 'fcs-notifs-asked';
const FIRES = 'fcs-notifs-fires';

const read = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

export const notificationsOn = () => read(ON) === 'on';
export const notificationsAsked = () => read(ASKED) === '1';
export const markNotificationsAsked = () => write(ASKED, '1');

async function granted(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/** Asks iOS for the permission (the system sheet shows once); true when notifications are on. */
export async function enableNotifications(): Promise<boolean> {
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions();
    markNotificationsAsked();
    if (p.display !== 'granted') {
      write(ON, 'off');
      return false;
    }
    write(ON, 'on');
    await rescheduleNotifications();
    return true;
  } catch {
    return false;
  }
}

/** One notification in a few seconds, to check that the phone shows them (put the app in the background to see it). */
export async function sendTestNotification(body: string): Promise<'sent' | 'denied'> {
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await LocalNotifications.requestPermissions();
    if (p.display !== 'granted') return 'denied';
    await LocalNotifications.schedule({ notifications: [{ id: 99, title: NOTIF_TITLE, body, schedule: { at: new Date(Date.now() + 6000) } }] });
    return 'sent';
  } catch {
    return 'denied';
  }
}

export async function disableNotifications() {
  write(ON, 'off');
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length) await LocalNotifications.cancel({ notifications });
  } catch {
    /* nothing pending */
  }
}

export async function rescheduleNotifications() {
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length) await LocalNotifications.cancel({ notifications });
    if (!notificationsOn() || !(await granted())) return;

    const g = useGameStore.getState();
    let fires: number[] = [];
    try {
      fires = (JSON.parse(read(FIRES) ?? '[]') as number[]).filter((n) => typeof n === 'number');
    } catch {
      fires = [];
    }
    const { items, livesFires } = planNotifications({
      now: Date.now(),
      player: g.player,
      season: g.season,
      year: g.year,
      clubName: getClub(g.player?.clubId ?? null)?.name ?? '',
      retired: g.phase === 'retired',
      recentLivesFires: fires,
    });
    write(FIRES, JSON.stringify(livesFires));
    if (!items.length) return;
    await LocalNotifications.schedule({
      notifications: items.map((n) => ({ id: n.id, title: NOTIF_TITLE, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true } })),
    });
  } catch {
    /* scheduling is best-effort */
  }
}

/** What the phone says: permission, whether they are switched on, and how many are waiting (for Settings). */
export async function notificationStatus(): Promise<{ permission: string; on: boolean; pending: number; next?: number }> {
  try {
    const p = await LocalNotifications.checkPermissions();
    const { notifications } = await LocalNotifications.getPending();
    const times = notifications.map((n) => (n.schedule?.at ? new Date(n.schedule.at).getTime() : 0)).filter((t) => t > 0);
    return { permission: p.display, on: notificationsOn(), pending: notifications.length, next: times.length ? Math.min(...times) : undefined };
  } catch {
    return { permission: 'error', on: notificationsOn(), pending: -1 };
  }
}

/** Keeps the reminders in step with the game: every change of lives, season or career re-plans them. */
export function initNotifications() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void rescheduleNotifications(), 500);
  };
  useGameStore.subscribe(later);
  useArchiveStore.subscribe(later);
  // the moment the app is left, plan again right away: a timer would never fire once the app is suspended
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void rescheduleNotifications();
  });
  void rescheduleNotifications();
}
