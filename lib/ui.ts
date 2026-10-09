'use client';

import { create } from 'zustand';

/** Hides the tab bar during live match phases so a stray tap can't abandon the game. */
export const useUiStore = create<{ immersive: boolean; setImmersive: (v: boolean) => void }>((set) => ({
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
}));
