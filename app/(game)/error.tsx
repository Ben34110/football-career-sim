'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useT } from '@/lib/i18n';

export default function GameError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <Card className="mt-10 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-gold-400" />
      <h2 className="mt-3 font-display text-2xl font-bold uppercase">{t('Red card!')}</h2>
      <p className="mt-1 text-sm text-zinc-400">{error.message || t('Something went wrong on the pitch.')}</p>
      <Button className="mt-5" onClick={reset}>
        {t('Try again')}
      </Button>
    </Card>
  );
}
