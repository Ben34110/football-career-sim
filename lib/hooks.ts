'use client';

import { useEffect, useState } from 'react';
import { msToNextBolt, syncEnergy } from './engine/player';
import { useLangStore } from './i18n/lang';
import { useGameStore } from './store';

/** Rehydrates the persisted save exactly once on the client. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useLangStore.getState().init();
    const unsub = useGameStore.persist.onFinishHydration(() => setHydrated(true));
    void useGameStore.persist.rehydrate();
    if (useGameStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Live bolt count with regen countdown. */
export function useEnergy() {
  const energy = useGameStore((s) => s.player?.energy);
  const now = useNow(1000);
  if (!energy) return { bolts: 0, msToNext: 0 };
  const synced = syncEnergy(energy, now);
  return { bolts: synced.bolts, msToNext: msToNextBolt(synced, now) };
}
