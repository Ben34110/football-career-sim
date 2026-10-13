'use client';

import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useT } from '@/lib/i18n';
import { isNativeApp } from '@/lib/platform';
import { useGameStore } from '@/lib/store';
import { useUiStore } from '@/lib/ui';

/**
 * Asks once, after the first match and outside a match, whether the player wants to be told when the lives are back.
 * The iOS permission sheet only comes if they say yes.
 */
export function NotificationPrompt() {
  const t = useT();
  const apps = useGameStore((s) => s.player?.totals.apps ?? 0);
  const immersive = useUiStore((s) => s.immersive);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNativeApp() || immersive || apps < 1) return;
    let cancelled = false;
    void import('@/lib/native/notifications').then((m) => {
      if (!cancelled && !m.notificationsAsked()) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [apps, immersive]);

  const later = async () => {
    setOpen(false);
    const m = await import('@/lib/native/notifications');
    m.markNotificationsAsked();
  };

  return (
    <Sheet open={open} dismissible onClose={later}>
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-400/15 text-neon-300">
            <BellRing className="h-6 w-6" />
          </span>
          <div className="font-display text-2xl font-extrabold uppercase leading-none">{t('Stay in the game')}</div>
        </div>
        <p className="mt-3 text-sm leading-snug text-zinc-400">{t('Get a heads-up when your lives are back, and a nudge if your player is waiting for you. You can turn this off any time in Settings.')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => void later()}>
            {t('Not now')}
          </Button>
          <Button
            onClick={async () => {
              setOpen(false);
              const m = await import('@/lib/native/notifications');
              await m.enableNotifications();
            }}
          >
            {t('Turn on')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
