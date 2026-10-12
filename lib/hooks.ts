'use client';

import { useEffect, useState } from 'react';
import { BOOST_BY_ID } from './data/boosts';
import { msToNextBolt, syncEnergy } from './engine/player';
import { useT } from './i18n';
import { useLangStore } from './i18n/lang';
import { boostProduct, getPaymentProvider } from './payments';
import { useGameStore } from './store';
import { toast } from './toast';

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

/** Buying a boost, with game money or with real money; both put one in the bag and say how it went. */
export function useBoostPurchase() {
  const t = useT();
  const buyBoost = useGameStore((s) => s.buyBoost);
  const grantBoost = useGameStore((s) => s.grantBoost);
  const [busy, setBusy] = useState<string | null>(null);

  const withMoney = (id: string) => {
    const r = buyBoost(id);
    toast(r.msg, r.ok ? 'good' : 'bad');
    return r.ok;
  };

  const withEuros = async (id: string) => {
    const def = BOOST_BY_ID[id];
    if (!def) return false;
    // never take money for something that cannot go in the bag
    if ((useGameStore.getState().player?.boosts?.[id] ?? 0) >= 9) {
      toast(t('You can only carry 9 of each boost.'), 'bad');
      return false;
    }
    setBusy(id);
    const r = await getPaymentProvider().purchase(boostProduct(def));
    setBusy(null);
    if (!r.ok) {
      toast(t('Purchase unavailable right now.'), 'bad');
      return false;
    }
    const g = grantBoost(id);
    toast(g.msg, g.ok ? 'good' : 'bad');
    return g.ok;
  };

  return { busy, withMoney, withEuros };
}
