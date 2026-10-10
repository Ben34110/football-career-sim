'use client';

import { Flag } from '@/components/ui/Flag';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { flagUrl } from '@/lib/flags';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { drawPotsOf, potTeams } from '@/lib/engine/tournament';
import type { TournamentState } from '@/lib/types';
import { cn } from '@/lib/utils';

const POT_NAME = ['Top seeds', 'Contenders', 'Challengers', 'Outsiders'];
/** A nation's flag, or a club's colour and initials */
function Mark({ team, size = 11 }: { team: { short: string; color?: string }; size?: number }) {
  const f = team.short.split(' ')[0];
  if (flagUrl(f)) return <Flag emoji={f} size={size} />;
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-block rounded-full" style={{ width: size * 0.8, height: size * 0.8, background: team.color ?? '#71717a' }} />
      <span className="text-[0.85em] font-bold tracking-wide">{team.short}</span>
    </span>
  );
}

const shuffled = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** The tournament group draw: one ball from each of the three pots makes your group of four. */
export function GroupDraw({ tourney, tournament, onDraw }: { tourney: TournamentState; tournament: string; onDraw: (picks: number[]) => void }) {
  const t = useT();
  const [picks, setPicks] = useState<number[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  // you draw from every pot but your own, strongest pot first
  const drawPots = drawPotsOf(tourney);
  const step = picks.length;
  const potIdx = drawPots[Math.min(step, drawPots.length - 1)];
  const pot = potTeams(tourney, potIdx);
  const done = step >= drawPots.length;
  const chosen = picks.map((p, i) => tourney.teams[potTeams(tourney, drawPots[i])[p]]);
  const myPot = tourney.pots.findIndex((p) => p.includes(tourney.me));
  // the balls are shuffled for every pot: ball number i hides a random team of the pot
  const orders = useMemo(() => drawPots.map((pi) => shuffled(potTeams(tourney, pi).length)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const order = orders[Math.min(step, orders.length - 1)];
  // the balls are tumbled in the drum before each draw
  const [mixing, setMixing] = useState(true);
  useEffect(() => {
    setMixing(true);
    const id = window.setTimeout(() => setMixing(false), 1100);
    return () => window.clearTimeout(id);
  }, [step]);

  const pick = (i: number) => {
    if (current !== null || mixing) return;
    haptic([20, 30, 20]);
    setCurrent(i);
    window.setTimeout(() => {
      setOpened(true);
      haptic([40, 40, 90]);
    }, 900);
  };
  const next = () => {
    if (current === null) return;
    setPicks((p) => [...p, order[current]]);
    setCurrent(null);
    setOpened(false);
  };

  const revealed = current !== null && opened ? tourney.teams[pot[order[current]]] : null;

  const cols = pot.length <= 4 ? Math.max(3, pot.length) : pot.length <= 8 ? 4 : 6;

  return (
    <div className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow text-gold-300">{t('Group draw')}</div>
          <h2 className="truncate font-display text-3xl font-extrabold uppercase leading-none">{t(tournament)}</h2>
        </div>
        {!done && (
          <div className="shrink-0 text-right">
            <Chip tone="gold">{t('Pot {n}', { n: potIdx + 1 })}</Chip>
            <div className="eyebrow mt-0.5">{t(POT_NAME[potIdx])}</div>
          </div>
        )}
      </div>

      {!done ? (
        <Card strong className="relative overflow-hidden p-3">
          <div aria-hidden className="pitch-lines pointer-events-none absolute inset-0 opacity-40" />
          <p className="relative mb-2 text-center text-xs text-zinc-400">{mixing ? t('Shuffling the balls…') : revealed ? ' ' : t('Pick a ball')}</p>
          <div className="relative mx-auto grid max-w-[340px] gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {pot.map((n, i) => {
              const isPicked = current === i;
              const dim = current !== null && !isPicked;
              // while the drum turns, every ball is thrown around
              const jx = ((i * 37) % 7) - 3;
              const jy = ((i * 53) % 7) - 3;
              return (
                <motion.button
                  key={`${step}-${i}`}
                  type="button"
                  disabled={current !== null || mixing}
                  onClick={() => pick(i)}
                  animate={
                    mixing
                      ? { x: [0, jx * 9, -jx * 7, jy * 6, 0], y: [0, jy * 8, -jy * 9, jx * 5, 0], rotate: [0, 140 + i * 10, -120, 90, 0], scale: [1, 1.05, 0.95, 1.05, 1] }
                      : current === null
                        ? { x: 0, y: [0, -3, 0], rotate: 0, scale: 1 }
                        : isPicked
                          ? opened
                            ? { scale: 1.25, x: 0, y: 0 }
                            : { x: [0, -5, 5, -4, 4, 0], scale: 1.2, y: 0 }
                          : { opacity: 0.25, scale: 0.85, x: 0, y: 0 }
                  }
                  transition={mixing ? { duration: 1.05, ease: 'easeInOut' } : current === null ? { repeat: Infinity, duration: 2 + (i % 5) * 0.25, ease: 'easeInOut' } : { duration: isPicked && !opened ? 0.9 : 0.3 }}
                  className={cn('relative flex aspect-square items-center justify-center rounded-full border-2 text-zinc-50 shadow-md', isPicked ? 'z-10 border-gold-300 shadow-gold' : 'border-white/25', dim && 'pointer-events-none')}
                  style={{ background: 'radial-gradient(circle at 35% 30%, #fafafa, #a1a1aa 35%, #3f3f46 85%)' }}
                  aria-label={`${t('Ball')} ${i + 1}`}
                >
                  <AnimatePresence mode="wait">
                    {isPicked && opened ? (
                      <motion.span key="open" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Mark team={tourney.teams[pot[order[i]]]} size={cols > 4 ? 15 : 20} />
                      </motion.span>
                    ) : (
                      <motion.span key="num" exit={{ scale: 0 }} className={cn('font-display font-extrabold text-zinc-900/80', cols > 4 ? 'text-lg' : 'text-2xl')}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
          <div className="relative mt-3 min-h-[44px]">
            {revealed ? (
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-center">
                <div className="font-display text-2xl font-extrabold uppercase leading-none">
                  <Mark team={revealed} size={20} /> {t(revealed.name)}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400">
                  {t('Squad')} <b className="font-num text-xs text-zinc-100">{tourney.teams[tourney.me].strength}</b> {t('vs')} <b className="font-num text-xs text-zinc-100">{revealed.strength}</b>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 py-3 text-center text-[11px] text-zinc-600">{t('Pick one ball from each pot to build your group of four.')}</div>
            )}
          </div>
        </Card>
      ) : (
        <p className="text-sm text-zinc-400">{t('Your group is set.')}</p>
      )}

      {/* what is already drawn */}
      <Card className="p-2.5">
        <div className="eyebrow mb-1.5">{t('Your group')}</div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center justify-between rounded-xl bg-neon-400/10 px-2.5 py-1.5 text-xs font-bold text-neon-300">
            <span className="truncate">
              <Mark team={tourney.teams[tourney.me]} size={13} />
            </span>
            <span className="font-num">{tourney.teams[tourney.me].strength}</span>
          </div>
          {drawPots.map((_, i) => {
            const team = chosen[i];
            return (
              <div key={i} className={cn('flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs', team ? 'bg-white/[0.06] font-semibold' : 'border border-dashed border-white/15 text-zinc-600')}>
                <span className="truncate">{team ? <Mark team={team} size={13} /> : `${t('Pot {n}', { n: drawPots[i] + 1 })}`}</span>
                {team && <span className="font-num text-zinc-400">{team.strength}</span>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* the seeding: four pots, strongest first */}
      <Card className="p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="eyebrow">{t('The pots')}</div>
          <span className="text-[10px] text-zinc-500">{t('You are in Pot {n}. Your group gets one team from each other pot.', { n: myPot + 1 })}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {tourney.pots.map((names, k) => (
            <div key={k} className={cn('rounded-lg p-1', k === myPot ? 'bg-neon-400/10 ring-1 ring-neon-400/30' : 'bg-white/[0.04]')}>
              <div className="mb-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-zinc-400">{t('Pot {n}', { n: k + 1 })}</div>
              <div>
                {names.map((n) => (
                  <div key={n} className={cn('flex items-center justify-between gap-0.5 text-[9px] leading-[13px]', n === tourney.me ? 'font-extrabold text-neon-300' : 'text-zinc-300')}>
                    <span className="truncate"><Mark team={tourney.teams[n]} size={9} /></span>
                    <span className="font-num text-zinc-500">{tourney.teams[n].strength}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <FloatingAction>
        {done ? (
          <Button block size="lg" onClick={() => onDraw(picks)}>
            {t('To the group stage')}
          </Button>
        ) : (
          <Button block size="lg" disabled={!revealed} onClick={next}>
            {step === drawPots.length - 1 ? t('Reveal my group') : t('Next pot')}
          </Button>
        )}
      </FloatingAction>
    </div>
  );
}
