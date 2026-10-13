'use client';

import { useEffect, useState } from 'react';
import { BOOST_BY_ID } from './data/boosts';
import { MAX_BOLTS, msToNextBolt, syncEnergy, unlimitedMsLeft } from './engine/player';
import { useT } from './i18n';
import { useLangStore } from './i18n/lang';
import { adsAvailable, adsLeft, getAdProvider, type AdKind } from './ads';
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
  const unlimitedUntil = useGameStore((s) => s.player?.unlimitedUntil);
  const now = useNow(1000);
  if (!energy) return { bolts: 0, msToNext: 0, unlimitedMs: 0 };
  // unlimited lives: always a full set, and the time left is shown instead of the regeneration
  const unlimitedMs = unlimitedMsLeft({ unlimitedUntil }, now);
  if (unlimitedMs > 0) return { bolts: MAX_BOLTS, msToNext: 0, unlimitedMs };
  const synced = syncEnergy(energy, now);
  return { bolts: synced.bolts, msToNext: msToNextBolt(synced, now), unlimitedMs: 0 };
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
      // closing the App Store sheet is not an error
      if (r.error !== 'cancelled') toast(t('Purchase unavailable right now.'), 'bad');
      return false;
    }
    const g = grantBoost(id);
    toast(g.msg, g.ok ? 'good' : 'bad');
    return g.ok;
  };

  return { busy, withMoney, withEuros };
}

/** Watching a rewarded ad for lives or for a boost. The reward is only given once the ad was watched to the end. */
export function useAdReward() {
  const t = useT();
  const adsToday = useGameStore((s) => s.player?.adsToday);
  const [busy, setBusy] = useState(false);

  /** Ads still allowed today for this kind (0 when there is no ad to show at all) */
  const left = (kind: AdKind) => (adsAvailable() ? adsLeft(adsToday, kind) : 0);

  const watch = async (kind: AdKind, boostId?: string) => {
    if (busy || left(kind) <= 0) return false;
    setBusy(true);
    const r = await getAdProvider().show();
    setBusy(false);
    if (!r.ok) {
      if (r.error !== 'cancelled') toast(t('No ad available right now. Try again in a moment.'), 'bad');
      else toast(t('Watch the ad to the end to get the reward.'), 'neutral');
      return false;
    }
    const g = useGameStore.getState().claimAdReward(kind, boostId);
    toast(g.msg, g.ok ? 'good' : 'bad');
    return g.ok;
  };

  return { busy, left, watch };
}
