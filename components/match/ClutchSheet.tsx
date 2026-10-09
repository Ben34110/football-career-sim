'use client';

import { motion } from 'framer-motion';
import { Brain, Eye, Flame, Target, Zap, type LucideIcon } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Card';
import { ATTR_LABEL } from '@/lib/engine/player';
import { successChance, type MatchCtx } from '@/lib/engine/match';
import { haptic } from '@/lib/haptics';
import type { AttrKey, ClutchMoment, MatchState } from '@/lib/types';
import { cn } from '@/lib/utils';

const ATTR_ICON: Record<AttrKey, LucideIcon> = { finishing: Target, composure: Brain, vision: Eye, stamina: Flame };
const RISK_TONE = { Safe: 'good', Balanced: 'gold', Bold: 'bad' } as const;

export function ClutchSheet({
  open,
  moment,
  match,
  ctx,
  index,
  total,
  onPick,
}: {
  open: boolean;
  moment: ClutchMoment | undefined;
  match: MatchState;
  ctx: MatchCtx;
  index: number;
  total: number;
  onPick: (optionId: string) => void;
}) {
  return (
    <Sheet open={open && !!moment}>
      {moment && (
        <div>
          <div className="flex items-center justify-between">
            <Chip tone="gold">
              <Zap className="h-3 w-3 fill-current" /> Clutch {index + 1}/{total}
            </Chip>
            <span className="font-num text-sm font-semibold text-zinc-400">{match.minute}&apos;</span>
          </div>
          <h3 className="mt-2 font-display text-[34px] font-extrabold uppercase leading-none">{moment.title}</h3>
          <p className="mt-1.5 text-sm leading-snug text-zinc-400">{moment.setup}</p>
          <div className="mt-4 space-y-2.5">
            {moment.options.map((o, i) => {
              const Icon = ATTR_ICON[o.attr];
              const chance = successChance(o, ctx, match);
              return (
                <motion.button
                  key={o.id}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.06 * i + 0.1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    haptic(20);
                    onPick(o.id);
                  }}
                  className="gloss-edge glass relative w-full overflow-hidden p-3.5 text-left transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold leading-tight">{o.label}</div>
                      <div className="mt-0.5 text-xs text-zinc-400">{o.hint}</div>
                    </div>
                    <Chip tone={RISK_TONE[o.risk]}>{o.risk}</Chip>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                      <Icon className="h-3.5 w-3.5 text-neon-300" />
                      {ATTR_LABEL[o.attr]} <span className="font-num text-sm text-zinc-100">{ctx.attrs[o.attr]}</span>
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" aria-label="Chance of success">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          chance > 0.6 ? 'bg-neon-400' : chance > 0.4 ? 'bg-gold-400' : 'bg-crimson-500',
                        )}
                        style={{ width: `${Math.round(chance * 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}
