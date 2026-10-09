'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { MAX_BOLTS } from '@/lib/engine/player';
import { cn, fmtCountdown } from '@/lib/utils';

export function Bolts({ bolts, msToNext, showTimer, size = 'md' }: { bolts: number; msToNext?: number; showTimer?: boolean; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex items-center gap-1.5" aria-label={`${bolts} of ${MAX_BOLTS} energy bolts`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_BOLTS }, (_, i) => {
          const on = i < bolts;
          return (
            <motion.div
              key={i}
              animate={on ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Zap
                className={cn(dim, on ? 'fill-gold-400 text-gold-300 drop-shadow-[0_0_6px_rgba(242,193,78,0.8)]' : 'text-zinc-600')}
              />
            </motion.div>
          );
        })}
      </div>
      {showTimer && bolts < MAX_BOLTS && msToNext !== undefined && (
        <span className="font-num text-xs font-semibold text-zinc-400">{fmtCountdown(msToNext)}</span>
      )}
    </div>
  );
}
