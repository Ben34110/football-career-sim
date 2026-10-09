'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { MAX_BOLTS } from '@/lib/engine/player';
import { useT } from '@/lib/i18n';
import { cn, fmtCountdown } from '@/lib/utils';

export function Bolts({ bolts, msToNext, showTimer, size = 'md' }: { bolts: number; msToNext?: number; showTimer?: boolean; size?: 'sm' | 'md' }) {
  const t = useT();
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-1.5" aria-label={t('{n} of {max} lives', { n: bolts, max: MAX_BOLTS })}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_BOLTS }, (_, i) => {
          const on = i < bolts;
          return (
            <motion.div
              key={i}
              animate={on ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Heart
                className={cn(dim, on ? 'fill-crimson-400 text-crimson-400 drop-shadow-[0_0_6px_rgba(251,75,94,0.7)]' : 'text-zinc-600')}
              />
            </motion.div>
          );
        })}
      </div>
      {bolts > MAX_BOLTS && <span className="font-num text-xs font-bold text-gold-300">+{bolts - MAX_BOLTS}</span>}
      {showTimer && bolts < MAX_BOLTS && msToNext !== undefined && (
        <span className="font-num text-xs font-semibold text-zinc-400">{fmtCountdown(msToNext)}</span>
      )}
    </div>
  );
}
