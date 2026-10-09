'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function NotFound() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl font-extrabold text-gold-300">404</p>
      <p className="mt-2 text-zinc-400">{t('Offside — that page doesn’t exist.')}</p>
      <Link href="/" className="mt-6 rounded-2xl bg-neon-400 px-5 py-3 text-sm font-bold text-zinc-950">
        {t('Back to kick-off')}
      </Link>
    </div>
  );
}
