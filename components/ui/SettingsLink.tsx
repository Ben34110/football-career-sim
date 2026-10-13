'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

/** Round gear button that opens the Settings screen. */
export function SettingsLink() {
  const t = useT();
  return (
    <Link href="/settings" aria-label={t('Settings')} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200 active:scale-90">
      <Settings className="h-4 w-4" />
    </Link>
  );
}
