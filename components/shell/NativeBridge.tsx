'use client';

import { useEffect } from 'react';
import { isNativeApp } from '@/lib/platform';

/**
 * In the iPhone app: starts store purchases, ads and the status bar.
 * In a browser (production): registers the service worker so the game can be played offline.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!isNativeApp()) {
      if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      return;
    }
    void import('@/lib/native/ios')
      .then(async (m) => {
        m.initAds();
        await m.initNative();
        const gc = await import('@/lib/native/gamecenter');
        await gc.initGameCenter();
        const nt = await import('@/lib/native/notifications');
        nt.initNotifications();
      })
      .catch(() => undefined);
  }, []);
  return null;
}
