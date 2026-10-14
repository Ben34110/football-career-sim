'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * A draw in progress: the balls already picked, so leaving the page (or the app) in the middle of a draw
 * does not start it again. The key says whose draw it is (career, season, tournament or round).
 */
export interface SavedDraw {
  /** Group draw: the ball picked in each pot so far (indexes into the pot's team list) */
  picks: number[];
  /** The ball picked now and not confirmed yet */
  current: number | null;
  /** How the balls of each pot were arranged, so they are in the same places when you come back */
  orders?: number[][];
}

interface DrawStore {
  saved: Record<string, SavedDraw>;
  put: (key: string, draw: SavedDraw) => void;
  drop: (key: string) => void;
}

export const useDrawStore = create<DrawStore>()(
  persist(
    (set) => ({
      saved: {},
      put: (key, draw) => set((s) => ({ saved: { ...s.saved, [key]: draw } })),
      drop: (key) =>
        set((s) => {
          if (!(key in s.saved)) return s;
          const next = { ...s.saved };
          delete next[key];
          return { saved: next };
        }),
    }),
    {
      name: 'fcs-draw-v1',
      version: 1,
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : window.localStorage) as Storage),
    },
  ),
);
