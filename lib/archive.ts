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
        const key = `${c.player.name}|${c.player.totals.apps}|${c.history.length}`;
        if (get().careers.some((x) => `${x.player.name}|${x.player.totals.apps}|${x.history.length}` === key)) return;
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

/** Files the running career before it is replaced. A career with no completed season is not worth keeping. */
export function archiveCurrent(state: { player: Player | null; history: SeasonRecord[]; phase: string }) {
  if (!state.player || state.history.length === 0) return;
  useArchiveStore.getState().add({ player: state.player, history: state.history, retired: state.phase === 'retired' });
}
