'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { useUiStore } from '@/lib/ui';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

/** Guards the in-game routes and provides the persistent chrome. */
export function GameShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasCareer = useGameStore((s) => s.hasCareer);
  const immersive = useUiStore((s) => s.immersive);

  useEffect(() => {
    if (!hasCareer) router.replace('/');
  }, [hasCareer, router]);

  if (!hasCareer) return null;
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className={immersive ? 'flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4' : 'flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4'}>{children}</main>
      {!immersive && <BottomNav />}
    </div>
  );
}
