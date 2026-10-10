'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Player, SeasonRecord } from './types';

/** A career that has been left behind: finished (retired) or replaced by a new one. */
export interface ArchivedCareer {
  id: string;
  endedAt: number;
  /** Retired, as opposed to dropped halfway */
  retired: boolean;
  player: Player;
  history: SeasonRecord[];
}

interface ArchiveStore {
  careers: ArchivedCareer[];
  add: (c: Omit<ArchivedCareer, 'id' | 'endedAt'>) => void;
  remove: (id: string) => void;
}

export const useArchiveStore = create<ArchiveStore>()(
  persist(
    (set, get) => ({
      careers: [],
      add: (c) => {
        // the same career is never filed twice
        const keyOf = (p: Player, n: number) => p.careerId ?? `${p.name}|${p.totals.apps}|${n}`;
        const key = keyOf(c.player, c.history.length);
        const existing = get().careers.find((x) => keyOf(x.player, x.history.length) === key);
        if (existing) {
          // the same career filed again with more in it (it went on, or it retired): keep the latest version
          if (existing.history.length < c.history.length || (!existing.retired && c.retired)) set({ careers: get().careers.map((x) => (x.id === existing.id ? { ...x, ...c } : x)) });
          return;
        }
        set({ careers: [{ ...c, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, endedAt: Date.now() }, ...get().careers] });
      },
      remove: (id) => set({ careers: get().careers.filter((c) => c.id !== id) }),
    }),
    {
      name: 'fcs-archive-v1',
      version: 1,
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : window.localStorage) as Storage),
    },
  ),
);

/** Files the running career before it is replaced. A career that was retired is always kept; one dropped before any match is not. */
export function archiveCurrent(state: { player: Player | null; history: SeasonRecord[]; phase: string }) {
  if (!state.player) return;
  if (state.phase !== 'retired' && state.history.length === 0 && state.player.totals.apps === 0) return;
  useArchiveStore.getState().add({ player: state.player, history: state.history, retired: state.phase === 'retired' });
}
