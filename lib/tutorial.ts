'use client';

import { create } from 'zustand';

/** The first-career tutorial: seen once (or skipped), and available again from Settings. */
const KEY = 'fcs-tutorial-v1';

export const tutorialSeen = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return true;
  }
};

const mark = (v: 'done' | 'skipped') => {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* private mode */
  }
};

interface TutorialStore {
  open: boolean;
  step: number;
  start: () => void;
  next: () => void;
  back: () => void;
  finish: (how: 'done' | 'skipped') => void;
}

export const useTutorial = create<TutorialStore>((set) => ({
  open: false,
  step: 0,
  start: () => set({ open: true, step: 0 }),
  next: () => set((s) => ({ step: s.step + 1 })),
  back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  finish: (how) => {
    mark(how);
    set({ open: false, step: 0 });
  },
}));
