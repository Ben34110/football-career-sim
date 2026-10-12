'use client';

import { useEffect, useState } from 'react';
import { useAdSimulator } from '@/lib/ads';
import { useT } from '@/lib/i18n';

const SECONDS = 3;

/** Stand-in for a rewarded video while developing in a browser: a short countdown, then the reward. */
export function AdSimulator() {
  const t = useT();
  const open = useAdSimulator((s) => s.open);
  const finish = useAdSimulator((s) => s.finish);
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (!open) return;
    setLeft(SECONDS);
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (open && left <= 0) finish({ ok: true });
  }, [open, left, finish]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] mx-auto flex max-w-[430px] flex-col items-center justify-center gap-4 bg-black px-6 text-center">
      <div className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-400">{t('Test ad')}</div>
      <div className="font-display text-7xl font-extrabold text-zinc-100">{Math.max(0, left)}</div>
      <p className="text-sm text-zinc-500">{t('A real ad plays here in the app. Watch it to the end to earn the reward.')}</p>
      <button onClick={() => finish({ ok: false, error: 'cancelled' })} className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400">
        {t('Close')}
      </button>
    </div>
  );
}
