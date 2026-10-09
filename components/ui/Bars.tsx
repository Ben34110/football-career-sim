'use client';

import { motion } from 'framer-motion';
import { Flame, Handshake, Heart, Users } from 'lucide-react';
import { ATTR_LABEL, REP_KEYS, REP_LABEL } from '@/lib/engine/player';
import { useT } from '@/lib/i18n';
import type { AttrKey, Attributes, RepKey, Reputation } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatBar({
  label,
  value,
  max = 99,
  delta,
  accent = 'neon',
  className,
}: {
  label: string;
  value: number;
  max?: number;
  delta?: number;
  accent?: 'neon' | 'gold';
  className?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span className="font-num text-lg font-bold leading-none text-zinc-50">
          {value}
          {delta ? (
            <span className={cn('ml-1.5 text-xs', delta > 0 ? 'text-neon-400' : 'text-crimson-400')}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          ) : null}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className={cn(
            'h-full rounded-full',
            accent === 'neon'
              ? 'bg-gradient-to-r from-neon-600 to-neon-300 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
              : 'bg-gradient-to-r from-gold-500 to-gold-200 shadow-[0_0_10px_rgba(242,193,78,0.5)]',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export function AttributeBars({ attrs, deltas }: { attrs: Attributes; deltas?: Partial<Attributes> }) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
      {(Object.keys(ATTR_LABEL) as AttrKey[]).map((k) => (
        <StatBar key={k} label={t(ATTR_LABEL[k])} value={attrs[k]} delta={deltas?.[k]} />
      ))}
    </div>
  );
}

const REP_ICON: Record<RepKey, React.ComponentType<{ className?: string }>> = {
  coachTrust: Handshake,
  fanPopularity: Heart,
  lockerRoom: Users,
  mediaHeat: Flame,
};

const REP_COLOR: Record<RepKey, string> = {
  coachTrust: 'from-sky-500 to-sky-300',
  fanPopularity: 'from-rose-500 to-rose-300',
  lockerRoom: 'from-neon-600 to-neon-300',
  mediaHeat: 'from-orange-500 to-gold-300',
};

export function RepBars({ rep, deltas, compact }: { rep: Reputation; deltas?: Partial<Reputation>; compact?: boolean }) {
  const t = useT();
  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-2 gap-x-4' : 'grid-cols-1')}>
      {REP_KEYS.map((k) => {
        const Icon = REP_ICON[k];
        const d = deltas?.[k];
        return (
          <div key={k}>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Icon className="h-3.5 w-3.5 text-zinc-500" />
                {t(compact ? REP_LABEL[k].replace(' Respect', '') : REP_LABEL[k])}
              </span>
              <span className="font-num text-sm font-bold text-zinc-100">
                {rep[k]}
                {d ? (
                  <span className={cn('ml-1 text-[11px]', d > 0 ? 'text-neon-400' : 'text-crimson-400')}>
                    {d > 0 ? `+${d}` : d}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className={cn('h-full rounded-full bg-gradient-to-r', REP_COLOR[k])}
                initial={{ width: 0 }}
                animate={{ width: `${rep[k]}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

