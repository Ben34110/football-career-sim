'use client';

import { Clapperboard } from 'lucide-react';
import { AD_DAILY_CAP, AD_REWARD, type AdKind } from '@/lib/ads';
import { useAdReward, useEnergy } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { WaitScreen } from './WaitScreen';

/** "Watch an ad, get it free": 3 lives, or a boost. Hidden when there is no ad to show or the day's allowance is used. */
export function AdButton({
  kind,
  boostId,
  onDone,
  className,
}: {
  kind: AdKind;
  boostId?: string;
  /** Called once the reward has been given */
  onDone?: () => void;
  className?: string;
}) {
  const t = useT();
  const { busy, left, watch } = useAdReward();
  const { bolts } = useEnergy();
  const n = left(kind);
  // lives only make sense when some are missing
  if (n <= 0 || (kind === 'lives' && bolts >= 5)) return null;
  return (
    <>
    {busy && <WaitScreen variant="overlay" message="Loading the ad…" />}
    <button
      disabled={busy}
      onClick={async () => {
        if (await watch(kind, boostId)) onDone?.();
      }}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-2xl border border-neon-400/40 bg-neon-400/10 px-4 py-3 text-[14px] font-bold text-neon-300 transition-transform active:scale-[0.98] disabled:opacity-50',
        className,
      )}
    >
      <Clapperboard className="h-4 w-4" aria-hidden />
      {kind === 'lives' ? t('Watch an ad · +{n} lives', { n: AD_REWARD.lives }) : t('Watch an ad · get it free')}
      <span className="text-[11px] font-semibold text-neon-300/70">
        {n}/{AD_DAILY_CAP[kind]}
      </span>
    </button>
    </>
  );
}
