'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import type { Fixture } from '@/lib/types';
import { cn, crestShort } from '@/lib/utils';
import type { TeamBadge } from './LiveMatch';

/** The draw: the player picks one of four balls, which decides the opponent of the round. */
export function CupDraw({ fixture, me, myStrength, onDraw }: { fixture: Fixture; me: TeamBadge; myStrength: number; onDraw: (index: number) => void }) {
  const t = useT();
  const pool = fixture.pool ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const result = picked !== null ? pool[picked] : null;
  const diff = result ? myStrength - result.opponentStrength : 0;
  const tag = diff >= 4 ? { t: 'Favourites', tone: 'good' as const } : diff <= -4 ? { t: 'Underdogs', tone: 'bad' as const } : { t: 'Even match', tone: 'gold' as const };
  const tournament = fixture.kind === 'tournament';

  const pick = (i: number) => {
    if (picked !== null) return;
    haptic([20, 30, 20]);
    setPicked(i);
    window.setTimeout(() => {
      setOpened(true);
      haptic([40, 40, 90]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1100);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow text-gold-300">{t(tournament ? 'Tournament draw' : fixture.kind === 'euro' ? 'European draw' : 'Cup draw')}</div>
        <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{t(fixture.label)}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {picked === null ? t('You are on stage. Pick a ball to reveal your opponent.') : opened ? t('Your opponent is…') : t('The ball opens…')}
        </p>
      </div>

      {/* the pot leaves the stage once the ball is open, so the fixture sits right under the title */}
      {!opened && (
      <Card strong className="relative overflow-hidden p-4">
        <div aria-hidden className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
        {/* the pot */}
        <div className={cn('relative grid gap-3', pool.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {pool.map((c, i) => {
            const isPicked = picked === i;
            const dim = picked !== null && !isPicked;
            return (
              <motion.button
                key={i}
                type="button"
                disabled={picked !== null}
                onClick={() => pick(i)}
                animate={
                  picked === null
                    ? { y: [0, -6, 0], rotate: [0, i % 2 ? 3 : -3, 0] }
                    : isPicked
                      ? opened
                        ? { scale: 1.05, y: 0, rotate: 0 }
                        : { x: [0, -8, 8, -6, 6, 0], scale: 1.1 }
                      : { opacity: 0.35, scale: 0.9 }
                }
                transition={picked === null ? { repeat: Infinity, duration: 2.2 + i * 0.3, ease: 'easeInOut' } : { duration: isPicked && !opened ? 0.9 : 0.3 }}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-full border-2 text-zinc-50 shadow-lg',
                  isPicked ? 'border-gold-300 shadow-gold' : 'border-white/25',
                )}
                style={{ background: `radial-gradient(circle at 35% 30%, #fafafa, #a1a1aa 35%, #3f3f46 85%)` }}
                aria-label={`${t('Ball')} ${i + 1}`}
              >
                <AnimatePresence mode="wait">
                  {isPicked && opened ? (
                    <motion.span key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                      <Crest short={crestShort(c.opponentShort)} color={c.opponentColor} size={44} />
                    </motion.span>
                  ) : (
                    <motion.span key="num" exit={{ scale: 0 }} className={cn('font-display font-extrabold text-zinc-900/80', pool.length === 3 ? 'text-4xl' : 'text-5xl')}>
                      {i + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </Card>
      )}

      <AnimatePresence>
        {result && opened && (
          <motion.div initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="space-y-3">
            <Card gold className="p-4">
              <div className="flex items-center gap-3">
                <Crest short={me.short} color={me.color} size={56} />
                <div className="flex-1 text-center">
                  <div className="font-display text-2xl font-extrabold text-zinc-500">VS</div>
                  <Chip tone={tag.tone}>{t(tag.t)}</Chip>
                </div>
                <Crest short={crestShort(result.opponentShort)} color={result.opponentColor} size={56} />
              </div>
              <div className="mt-3 text-center">
                <div className="font-display text-4xl font-extrabold uppercase leading-none">{t(result.opponent)}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {t('Squad')} <b className="font-num text-sm text-zinc-100">{Math.round(myStrength)}</b> {t('vs')} <b className="font-num text-sm text-zinc-100">{result.opponentStrength}</b>
                </div>
              </div>
            </Card>
            {pool.length === 3 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="eyebrow mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {t('The other semi-final')}
                </div>
                {(() => {
                  const [a, b] = pool.filter((_, i) => i !== picked);
                  return a && b ? (
                    <div className="flex items-center justify-between text-sm font-semibold text-zinc-200">
                      <span className="truncate">{t(a.opponent)}</span>
                      <span className="px-2 text-xs text-zinc-500">{t('vs')}</span>
                      <span className="truncate text-right">{t(b.opponent)}</span>
                    </div>
                  ) : null;
                })()}
                <p className="mt-1.5 text-[11px] text-zinc-500">{t('The winner will be your opponent in the final.')}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="eyebrow mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {t('The other balls held')}
                </div>
                <div className="space-y-1">
                  {pool.map((c, i) =>
                    i === picked ? null : (
                      <div key={i} className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="truncate">
                          {i + 1} · {t(c.opponent)}
                        </span>
                        <span className="font-num">{c.opponentStrength}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
            <FloatingAction>
              <Button block size="lg" onClick={() => picked !== null && onDraw(picked)}>
                {t('To the match')}
              </Button>
            </FloatingAction>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
