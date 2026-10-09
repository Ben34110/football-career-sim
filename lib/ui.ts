'use client';

import { create } from 'zustand';
import type { Position } from './types';

export interface SigningEvent {
  id: number;
  /** signed = full ceremony, agreed = deal for next season, renewal = contract extended */
  kind: 'signed' | 'agreed' | 'renewal';
  clubId: string;
  playerName: string;
  position: Position;
  /** €K per week */
  wage: number;
  years: number;
  /** €M */
  fee: number;
}

interface UiStore {
  immersive: boolean;
  setImmersive: (v: boolean) => void;
  signing: SigningEvent | null;
  showSigning: (e: Omit<SigningEvent, 'id'>) => void;
  closeSigning: () => void;
}

let signingSeq = 0;

/** `immersive` hides the tab bar during live match phases so a stray tap can't abandon the game. */
export const useUiStore = create<UiStore>((set) => ({
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
  signing: null,
  showSigning: (e) => set({ signing: { ...e, id: ++signingSeq } }),
  closeSigning: () => set({ signing: null }),
}));
