'use client';

import { Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { isNativeApp } from '@/lib/platform';
import { toast } from '@/lib/toast';
import { Button } from './Button';

/** Game Center leaderboard of goals (every career on the phone). Only exists in the iPhone app. */
export function LeaderboardButton({ className }: { className?: string }) {
  const t = useT();
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  if (!native) return null;
  return (
    <Button
      variant="ghost"
      block
      className={className}
      onClick={async () => {
        const m = await import('@/lib/native/gamecenter');
        if (!(await m.showGoalsLeaderboard())) toast(t('Sign in to Game Center in Settings to see the leaderboard.'), 'bad');
      }}
    >
      <Trophy className="h-4 w-4 text-gold-300" /> {t('Goals leaderboard')}
    </Button>
  );
}
