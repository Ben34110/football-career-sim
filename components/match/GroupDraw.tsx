'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import type { TournamentState } from '@/lib/types';
import { cn } from '@/lib/utils';

const POT_NAME = ['Top seeds', 'Contenders', 'Outsiders'];
const flagOf = (short: string) => short.split(' ')[0];

/** The tournament group draw: one ball from each of the three pots makes your group of four. */
export function GroupDraw({ tourney, tournament, onDraw }: { tourney: TournamentState; tournament: string; onDraw: (picks: number[]) => void }) {
  const t = useT();
  const [picks, setPicks] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const step = picks.length;
  const potIdx = tourney.potOrder[Math.min(step, 2)];
  const pot = tourney.pots[potIdx];
  const done = step >= 3;
  const chosen = picks.map((p, i) => tourney.teams[tourney.pots[tourney.potOrder[i]][p]]);

  const pick = (i: number) => {
    if (current !== null) return;
    haptic([20, 30, 20]);
    setCurrent(i);
    window.setTimeout(() => {
      setOpened(true);
      haptic([40, 40, 90]);
    }, 900);
  };
  const next = () => {
    if (current === null) return;
    setPicks((p) => [...p, current]);
    setCurrent(null);
    setOpened(false);
  };

  const revealed = current !== null && opened ? tourney.teams[pot[current]] : null;

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow text-gold-300">{t('Group draw')}</div>
        <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{t(tournament)}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {done ? t('Your group is set.') : t('Pick one ball from each pot to build your group of four.')}
        </p>
      </div>

      {/* what is already drawn */}
      <Card className="p-3">
        <div className="eyebrow mb-2">{t('Your group')}</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-xl bg-neon-400/10 px-3 py-2 text-[13px] font-bold text-neon-300">
            <span>
              {flagOf(tourney.teams[tourney.me].short)} {t(tourney.me)}
            </span>
            <span className="font-num">{tourney.teams[tourney.me].strength}</span>
          </div>
          {[0, 1, 2].map((i) => {
            const team = chosen[i];
            return (
              <div key={i} className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-[13px]', team ? 'bg-white/[0.06] font-semibold' : 'border border-dashed border-white/15 text-zinc-600')}>
                <span>{team ? `${flagOf(team.short)} ${t(team.name)}` : `${t('Pot {n}', { n: i + 1 })} · ${t(POT_NAME[tourney.potOrder[i]])}`}</span>
                {team && <span className="font-num text-zinc-400">{team.strength}</span>}
              </div>
            );
          })}
        </div>
      </Card>

      {!done && (
        <Card strong className="relative overflow-hidden p-4">
          <div aria-hidden className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative mb-3 flex items-center justify-between">
            <Chip tone="gold">{t('Pot {n}', { n: step + 1 })}</Chip>
            <span className="eyebrow">{t(POT_NAME[potIdx])}</span>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            {pot.map((n, i) => {
              const isPicked = current === i;
              const dim = current !== null && !isPicked;
              return (
                <motion.button
                  key={`${step}-${n}`}
                  type="button"
                  disabled={current !== null}
                  onClick={() => pick(i)}
                  animate={current === null ? { y: [0, -5, 0], rotate: [0, i % 2 ? 3 : -3, 0] } : isPicked ? (opened ? { scale: 1.08 } : { x: [0, -8, 8, -6, 6, 0], scale: 1.1 }) : { opacity: 0.3, scale: 0.9 }}
                  transition={current === null ? { repeat: Infinity, duration: 2.2 + i * 0.25, ease: 'easeInOut' } : { duration: isPicked && !opened ? 0.9 : 0.3 }}
                  className={cn('relative flex aspect-square items-center justify-center rounded-full border-2 text-zinc-50 shadow-lg', isPicked ? 'border-gold-300 shadow-gold' : 'border-white/25', dim && 'pointer-events-none')}
                  style={{ background: 'radial-gradient(circle at 35% 30%, #fafafa, #a1a1aa 35%, #3f3f46 85%)' }}
                  aria-label={`${t('Ball')} ${i + 1}`}
                >
                  <AnimatePresence mode="wait">
                    {isPicked && opened ? (
                      <motion.span key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl">
                        {flagOf(tourney.teams[n].short)}
                      </motion.span>
                    ) : (
                      <motion.span key="num" exit={{ scale: 0 }} className="font-display text-3xl font-extrabold text-zinc-900/80">
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
          {revealed && (
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative mt-4 rounded-2xl border border-gold-400/30 bg-gold-400/10 p-3 text-center">
              <div className="font-display text-3xl font-extrabold uppercase leading-none">
                {flagOf(revealed.short)} {t(revealed.name)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {t('Squad')} <b className="font-num text-sm text-zinc-100">{tourney.teams[tourney.me].strength}</b> {t('vs')} <b className="font-num text-sm text-zinc-100">{revealed.strength}</b>
              </div>
            </motion.div>
          )}
        </Card>
      )}

      <FloatingAction>
        {done ? (
          <Button block size="lg" onClick={() => onDraw(picks)}>
            {t('To the group stage')}
          </Button>
        ) : (
          <Button block size="lg" disabled={!revealed} onClick={next}>
            {step === 2 ? t('Reveal my group') : t('Next pot')}
          </Button>
        )}
      </FloatingAction>
    </div>
  );
}
