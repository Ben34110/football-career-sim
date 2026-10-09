'use client';

import { motion } from 'framer-motion';
import { AlertOctagon, Flame, Newspaper } from 'lucide-react';
import { useState } from 'react';
import { Card, Chip } from '@/components/ui/Card';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { Button } from '@/components/ui/Button';
import { reactionChance, type Controversy, type ControversyOption, type Effect } from '@/lib/data/controversies';
import { REP_LABEL } from '@/lib/engine/player';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import type { RepKey } from '@/lib/types';
import { cn } from '@/lib/utils';

const RISK_TONE = { Safe: 'good', Balanced: 'gold', Bold: 'bad' } as const;

export function ControversyPanel({ scandal, onDone }: { scandal: Controversy; onDone: () => void }) {
  const t = useT();
  const player = useGameStore((s) => s.player)!;
  const resolve = useGameStore((s) => s.resolveControversy);
  const [outcome, setOutcome] = useState<{ option: ControversyOption; good: boolean; effect: Effect; fired: boolean } | null>(null);

  const strikes = player.strikes ?? 0;

  const react = (o: ControversyOption) => {
    if (outcome) return;
    haptic(20);
    const p = reactionChance(o, player.rep);
    const good = Math.random() < p;
    const effect = good ? o.win : o.lose;
    const fired = resolve(effect, scandal.title);
    haptic(good ? [30, 40, 60] : [120]);
    setOutcome({ option: o, good, effect, fired });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow flex items-center gap-1.5 text-crimson-400">
          <AlertOctagon className="h-3.5 w-3.5" /> {t('Breaking news')}
        </div>
        <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{t(scandal.title)}</h2>
      </div>

      <Card strong className="border-crimson-500/30 p-4">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-crimson-400">
          <Newspaper className="h-3.5 w-3.5" /> {t(scandal.headline)}
        </div>
        <p className="mt-2 text-[15px] leading-snug text-zinc-200">{t(scandal.setup)}</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-semibold">{t('Scandal strikes')}</span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('h-2.5 w-6 rounded-full', i < strikes ? 'bg-crimson-500' : 'bg-white/10')} />
            ))}
          </span>
          <span className="text-zinc-500">{t('3 strikes and the club cuts you loose.')}</span>
        </div>
      </Card>

      {!outcome && (
        <>
          <p className="px-0.5 text-xs font-semibold text-zinc-400">{t('How do you react?')}</p>
          <div className="space-y-2.5">
            {scandal.options.map((o, i) => {
              const chance = reactionChance(o, player.rep);
              return (
                <motion.button
                  key={o.style}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.07 * i }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => react(o)}
                  className="gloss-edge w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold">{t(o.label)}</div>
                      <div className="text-xs text-zinc-400">{t(o.hint)}</div>
                    </div>
                    <Chip tone={RISK_TONE[o.risk]}>{t(o.risk)}</Chip>
                  </div>
                  <p className="mt-2 text-[13px] italic text-zinc-400">{t(o.quote)}</p>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10" aria-label={t('Chance of success')}>
                    <div className={cn('h-full rounded-full', chance > 0.6 ? 'bg-neon-400' : chance > 0.4 ? 'bg-gold-400' : 'bg-crimson-500')} style={{ width: `${Math.round(chance * 100)}%` }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {outcome && (
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-3">
          <Card className={cn('p-4', outcome.good ? 'border-neon-400/40' : 'border-crimson-500/40')}>
            <div className={cn('flex items-center gap-2 font-display text-2xl font-extrabold uppercase', outcome.good ? 'text-neon-300' : 'text-crimson-400')}>
              <Flame className="h-5 w-5" /> {outcome.good ? t('Crisis handled') : t('It backfires')}
            </div>
            <p className="mt-1.5 text-sm text-zinc-300">{t(outcome.good ? outcome.option.winText : outcome.option.loseText)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {outcome.effect.morale !== 0 && (
                <Chip tone="info">
                  {t('Morale')} {outcome.effect.morale > 0 ? '+' : ''}
                  {outcome.effect.morale}
                </Chip>
              )}
              {(Object.entries(outcome.effect.rep) as [RepKey, number][]).map(([k, v]) => (
                <Chip key={k} tone={k === 'mediaHeat' ? 'gold' : v > 0 ? 'good' : 'bad'}>
                  {t(REP_LABEL[k].replace(' Respect', ''))} {v > 0 ? '+' : ''}
                  {v}
                </Chip>
              ))}
              {outcome.effect.strike > 0 && <Chip tone="bad">{t('Scandal strike')} +1</Chip>}
              {outcome.effect.strike < 0 && <Chip tone="good">{t('Scandal strike')} −1</Chip>}
              {outcome.effect.fine ? <Chip tone="bad">{t('Fined')}</Chip> : null}
            </div>
          </Card>
          {outcome.fired && (
            <Card className="border-crimson-500/50 bg-crimson-500/10 p-4 text-sm">
              <b className="text-crimson-400">{t('Contract terminated.')}</b> <span className="text-zinc-300">{t('Too many scandals — the club has had enough. You’re a free agent now, and the market is watching.')}</span>
            </Card>
          )}
          <FloatingAction>
            <Button block size="lg" variant={outcome.good ? 'primary' : 'ghost'} onClick={onDone}>
              {t('Continue')}
            </Button>
          </FloatingAction>
        </motion.div>
      )}
    </div>
  );
}
