'use client';

import { Button } from '@/components/ui/Button';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-5xl font-extrabold uppercase text-crimson-400">Red card</p>
      <p className="mt-2 text-sm text-zinc-400">{error.message || 'Something went wrong.'}</p>
      <Button className="mt-6" onClick={reset}>
        Back on the pitch
      </Button>
    </div>
  );
}
