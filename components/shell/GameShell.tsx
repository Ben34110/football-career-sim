'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';
import { WaitScreen } from '@/components/ui/WaitScreen';
import { PAGER_PAGES, pagerIndexOf } from '@/lib/pager';
import { useGameStore } from '@/lib/store';
import { useUiStore } from '@/lib/ui';
import { BottomNav } from './BottomNav';
import { TabPager } from './TabPager';
import { TopBar } from './TopBar';

/** Guards the in-game routes and provides the persistent chrome. */
export function GameShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasCareer = useGameStore((s) => s.hasCareer);
  const immersive = useUiStore((s) => s.immersive);
  const pathname = usePathname();

  // the four tab pages live side by side on one strip that follows the finger (the match page is left out of it:
  // a stray flick must never start a game)
  const at = pagerIndexOf(pathname);

  useEffect(() => {
    if (!hasCareer) router.replace('/');
  }, [hasCareer, router]);

  if (!hasCareer) return <WaitScreen />;
  if (at >= 0 && !immersive) {
    return (
      <div className="flex h-dvh flex-col">
        <TopBar />
        <main className="min-h-0 flex-1">
          <TabPager active={at} onSettle={(i) => router.replace(PAGER_PAGES[i], { scroll: false })} />
        </main>
        <BottomNav />
        <NotificationPrompt />
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className={immersive ? 'flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4' : 'flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4'}>{children}</main>
      {!immersive && <BottomNav />}
      <NotificationPrompt />
    </div>
  );
}
