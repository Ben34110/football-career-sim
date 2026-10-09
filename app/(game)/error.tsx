'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function GameError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mt-10 p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-gold-400" />
      <h2 className="mt-3 font-display text-2xl font-bold uppercase">Red card!</h2>
      <p className="mt-1 text-sm text-zinc-400">{error.message || 'Something went wrong on the pitch.'}</p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
