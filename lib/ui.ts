'use client';

import { create } from 'zustand';
import type { OmissionReason } from './engine/selection';
import type { NationalLevel } from './engine/player';
import type { CelebrationEvent } from './data/celebrations';
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

export interface CallUpEvent {
  id: number;
  outcome: 'called' | 'omitted';
  level: NationalLevel;
  nationCode: string;
  /** Tournament name when it is the summer competition */
  competition?: string;
  /** Matches you will play (ISO date when known) */
  matches: { label: string; opponent: string; date?: string }[];
  reason?: OmissionReason;
}

interface UiStore {
  /** National-team selections waiting to be shown (after the match flow) */
  callUps: CallUpEvent[];
  pushCallUp: (e: Omit<CallUpEvent, 'id'>) => void;
  shiftCallUp: () => void;
  immersive: boolean;
  setImmersive: (v: boolean) => void;
  /** Trophy ceremonies waiting for the match flow to finish */
  pendingCelebrations: CelebrationEvent[];
  /** Ceremonies being shown, one after the other */
  celebrations: CelebrationEvent[];
  queueCelebration: (e: Omit<CelebrationEvent, 'id'>) => void;
  /** Moves the waiting ceremonies on screen (called once the player has seen the result) */
  releaseCelebrations: () => void;
  closeCelebration: () => void;
  signing: SigningEvent | null;
  showSigning: (e: Omit<SigningEvent, 'id'>) => void;
  closeSigning: () => void;
}

let signingSeq = 0;

/** `immersive` hides the tab bar during live match phases so a stray tap can't abandon the game. */
export const useUiStore = create<UiStore>((set) => ({
  callUps: [],
  pushCallUp: (e) => set((s) => ({ callUps: [...s.callUps, { ...e, id: ++signingSeq }] })),
  shiftCallUp: () => set((s) => ({ callUps: s.callUps.slice(1) })),
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
  pendingCelebrations: [],
  celebrations: [],
  queueCelebration: (e) => set((s) => ({ pendingCelebrations: [...s.pendingCelebrations, { ...e, id: ++signingSeq }] })),
  releaseCelebrations: () => set((s) => (s.pendingCelebrations.length ? { celebrations: [...s.celebrations, ...s.pendingCelebrations], pendingCelebrations: [] } : s)),
  closeCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
  signing: null,
  showSigning: (e) => set({ signing: { ...e, id: ++signingSeq } }),
  closeSigning: () => set({ signing: null }),
}));
