'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { clamp } from '@/lib/engine/rng';
import {
  addKick,
  currentRound,
  nextSide,
  playerTakesNext,
  startShootout,
  tally,
  winner,
  type ShootoutState,
} from '@/lib/engine/shootout';
import type { MatchCtx } from '@/lib/engine/match';
import { cn } from '@/lib/utils';
import { GoalTarget } from './GoalTarget';
import type { TeamBadge } from './LiveMatch';

export interface ShootoutResult {
  winner: 'me' | 'opp';
  my: number;
  opp: number;
  playerScored: number;
  playerMissed: number;
}

export function Shootout({
  ctx,
  me,
  opp,
  finishing,
  composure,
  onDone,
}: {
  ctx: MatchCtx;
  me: TeamBadge;
  opp: TeamBadge;
  finishing: number;
  composure: number;
  onDone: (r: ShootoutResult) => void;
}) {
  const [s, setS] = useState<ShootoutState>(() => startShootout(Math.random));
  const win = winner(s);
  const t = tally(s);
  const diff = ctx.myStr - ctx.oppStr;
  const side = nextSide(s);
  const playerTurn = !win && playerTakesNext(s);
  const round = currentRound(s);
  const lastKick = s.kicks[s.kicks.length - 1];

  /* Teammates and opponents are resolved automatically */
  useEffect(() => {
    if (win || playerTurn) return;
    const conv = side === 'me' ? clamp(0.72 + diff / 400, 0.6, 0.85) : clamp(0.73 - diff / 500, 0.6, 0.85);
    const id = setTimeout(() => setS((p) => addKick(p, Math.random() < conv, false)), 1150);
    return () => clearTimeout(id);
  }, [s.kicks.length, win, playerTurn, side, diff]);

  useEffect(() => {
    if (!win) return;
    const id = setTimeout(() => {
      const mine = s.kicks.filter((k) => k.byPlayer);
      onDone({
        winner: win,
        my: t.my,
        opp: t.opp,
        playerScored: mine.filter((k) => k.scored).length,
        playerMissed: mine.filter((k) => !k.scored).length,
      });
    }, 1800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win]);

  const pressure = clamp(0.45 + 0.08 * Math.min(round, 6) + (round > 5 ? 0.15 : 0), 0, 1);

  return (
    <div className="space-y-4">
      <Card strong gold className="p-4">
        <div className="mb-3 text-center">
          <div className="eyebrow text-gold-300">Penalty shootout</div>
          <div className="font-num text-5xl font-extrabold leading-none">
            {t.my}
            <span className="mx-2 text-zinc-600">–</span>
            {t.opp}
          </div>
        </div>
        <PipRow badge={me} kicks={s.kicks.filter((k) => k.side === 'me')} active={!win && side === 'me'} />
        <div className="h-2" />
        <PipRow badge={opp} kicks={s.kicks.filter((k) => k.side === 'opp')} active={!win && side === 'opp'} />
      </Card>

      {win ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-10 text-center">
          <div className={cn('font-display text-6xl font-extrabold uppercase italic', win === 'me' ? 'text-neon-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]' : 'text-crimson-400')}>
            {win === 'me' ? 'Through!' : 'Eliminated'}
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {win === 'me' ? `${me.name} win ${t.my}–${t.opp} on penalties.` : `${opp.name} win ${t.opp}–${t.my} on penalties.`}
          </p>
        </motion.div>
      ) : playerTurn ? (
        <GoalTarget
          key={s.kicks.length}
          kind="shootout"
          finishing={finishing}
          composure={composure}
          keeperLevel={ctx.oppStr}
          pressure={pressure}
          title={round > 5 ? 'Sudden Death' : `Kick ${round}`}
          subtitle="You step up. The whole stadium holds its breath."
          onDone={(o) => setS((p) => addKick(p, o.result === 'goal', true))}
        />
      ) : (
        <Card className="p-8 text-center">
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-4xl">
            🧤
          </motion.div>
          <p className="mt-3 font-display text-2xl font-bold uppercase">
            {side === 'me' ? 'Teammate steps up…' : `${opp.name} step up…`}
          </p>
          <AnimatePresence mode="wait">
            {lastKick && (
              <motion.p
                key={s.kicks.length}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('mt-2 text-sm font-semibold', lastKick.scored ? (lastKick.side === 'me' ? 'text-neon-300' : 'text-crimson-400') : lastKick.side === 'me' ? 'text-crimson-400' : 'text-neon-300')}
              >
                Previous: {lastKick.byPlayer ? 'You' : lastKick.side === 'me' ? 'Teammate' : 'Opponent'} {lastKick.scored ? 'scored' : 'missed'}
              </motion.p>
            )}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
}

function PipRow({ badge, kicks, active }: { badge: TeamBadge; kicks: ShootoutState['kicks']; active: boolean }) {
  const slots = Math.max(5, kicks.length + (active ? 1 : 0));
  return (
    <div className={cn('flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors', active && 'bg-white/[0.06]')}>
      <Crest short={badge.short} color={badge.color} size={30} />
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {Array.from({ length: slots }, (_, i) => {
          const k = kicks[i];
          return (
            <motion.span
              key={i}
              initial={false}
              animate={k ? { scale: [0.5, 1.2, 1] } : { scale: 1 }}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-white',
                !k && 'border-white/15 bg-white/[0.04]',
                k?.scored && 'border-neon-300 bg-neon-500 shadow-neon',
                k && !k.scored && 'border-crimson-400 bg-crimson-500 shadow-crimson',
              )}
            >
              {k && (k.scored ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />)}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
