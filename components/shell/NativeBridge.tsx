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
    // each service starts on its own: one that fails, or never answers (Game Center waiting for a sign-in), blocks nothing
    void import('@/lib/native/notifications').then((m) => m.initNotifications()).catch(() => undefined);
    void import('@/lib/native/ios')
      .then(async (m) => {
        m.initAds();
        await m.initNative();
      })
      .catch(() => undefined);
    void import('@/lib/native/gamecenter').then((m) => m.initGameCenter()).catch(() => undefined);
  }, []);
  return null;
}
