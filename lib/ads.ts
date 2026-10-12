import { create } from 'zustand';

/**
 * Rewarded ads: watch one to get something you would otherwise pay for. Same shape as the payments:
 * the iPhone app registers a real provider (AdMob) at start-up; a browser in development gets a simulated ad so the
 * flow can be tried; a production web build has no ads at all.
 */
export type AdKind = 'lives' | 'boost';

/** What one ad is worth, and how many can be watched in a day (so ads stay a bonus, not the way to play). */
export const AD_REWARD = { lives: 3 } as const;
export const AD_DAILY_CAP: Record<AdKind, number> = { lives: 5, boost: 3 };

export interface AdResult {
  /** The reward was earned (the ad was watched to the end) */
  ok: boolean;
  error?: 'cancelled' | 'unavailable' | 'failed';
}

export interface AdProvider {
  name: string;
  isReal: boolean;
  show: () => Promise<AdResult>;
}

/* ───────── The simulated ad (development only) ───────── */

interface SimState {
  open: boolean;
  resolve: ((r: AdResult) => void) | null;
  start: () => Promise<AdResult>;
  finish: (r: AdResult) => void;
}

export const useAdSimulator = create<SimState>((set, get) => ({
  open: false,
  resolve: null,
  start: () =>
    new Promise<AdResult>((resolve) => {
      set({ open: true, resolve });
    }),
  finish: (r) => {
    get().resolve?.(r);
    set({ open: false, resolve: null });
  },
}));

const testMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ADS_TEST === '1';

const simulated: AdProvider = { name: 'simulated', isReal: false, show: () => useAdSimulator.getState().start() };
const unavailable: AdProvider = { name: 'unavailable', isReal: false, show: async () => ({ ok: false, error: 'unavailable' }) };

let provider: AdProvider = testMode ? simulated : unavailable;

export const registerAdProvider = (p: AdProvider) => {
  provider = p;
};
export const getAdProvider = () => provider;
export const adsAvailable = () => provider.name !== 'unavailable';
export const isTestAds = () => adsAvailable() && !provider.isReal;

/* ───────── Daily allowance ───────── */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface AdsToday {
  day: string;
  lives: number;
  boost: number;
}

/** How many more ads of this kind can be watched today. */
export function adsLeft(used: AdsToday | undefined, kind: AdKind): number {
  const n = used && used.day === today() ? used[kind] : 0;
  return Math.max(0, AD_DAILY_CAP[kind] - n);
}

export function bumpAds(used: AdsToday | undefined, kind: AdKind): AdsToday {
  const base: AdsToday = used && used.day === today() ? used : { day: today(), lives: 0, boost: 0 };
  return { ...base, [kind]: base[kind] + 1 };
}
