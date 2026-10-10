'use client';

import { Coins } from 'lucide-react';
import Link from 'next/link';
import { Bolts } from '@/components/ui/Bolts';
import { HeadAvatar } from '@/components/ui/HeadAvatar';
import { getClub } from '@/lib/data/clubs';
import { fmtMoneyK, seasonLabel } from '@/lib/engine/player';
import { useEnergy } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { useUiStore } from '@/lib/ui';

export function TopBar() {
  const t = useT();
  const player = useGameStore((s) => s.player);
  const year = useGameStore((s) => s.year);
  const phase = useGameStore((s) => s.phase);
  const { bolts, msToNext } = useEnergy();
  // during a live match, shop and profile stay out of reach
  const locked = useUiStore((s) => s.immersive);
  if (!player) return null;
  const club = getClub(player.clubId);
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-white/[0.06] bg-zinc-950/75 backdrop-blur-2xl">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {locked ? (
            <HeadAvatar look={player.look} size={34} />
          ) : (
            <Link href="/profile" aria-label={t('Profile')} className="active:scale-95">
              <HeadAvatar look={player.look} size={34} />
            </Link>
          )}
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-bold text-zinc-100">{club?.name ?? t('Free agent')}</div>
            <div className="text-[11px] text-zinc-500">
              {phase === 'retired' ? t('Retired') : `${t('Season')} ${seasonLabel(year)}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {locked ? (
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-semibold text-gold-300/70" aria-label={fmtMoneyK(player.money)}>
              <Coins className="h-3.5 w-3.5" />
              <span className="font-num">{fmtMoneyK(player.money)}</span>
            </div>
          ) : (
            <Link href="/shop" aria-label={t('Shop')} className="flex items-center gap-1 rounded-full border border-gold-400/25 bg-gold-400/[0.08] px-2.5 py-1 text-[12px] font-semibold text-gold-300 active:scale-95">
              <Coins className="h-3.5 w-3.5" />
              <span className="font-num">{fmtMoneyK(player.money)}</span>
            </Link>
          )}
          <Bolts bolts={bolts} msToNext={msToNext} showTimer size="sm" />
        </div>
      </div>
    </header>
  );
}
