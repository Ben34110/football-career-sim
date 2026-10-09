'use client';

import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-5xl font-extrabold uppercase text-crimson-400">{t('Red card')}</p>
      <p className="mt-2 text-sm text-zinc-400">{error.message || t('Something went wrong.')}</p>
      <Button className="mt-6" onClick={reset}>
        {t('Back on the pitch')}
      </Button>
    </div>
  );
}
