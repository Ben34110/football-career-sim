'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { FastForward, Pause, Play, Radio } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { Sheet } from '@/components/ui/Sheet';
import { applyKick, createMatch, pressureFor, resolveClutch, resolveMini, tickMatch, type MatchCtx } from '@/lib/engine/match';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import type { KickKind, MatchEvent, MiniKind, MiniQuality, MatchState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ClutchSheet } from './ClutchSheet';
import { GoalTarget } from './GoalTarget';
import { MiniGame } from './MiniGame';

export interface TeamBadge {
  name: string;
  short: string;
  color: string;
}

interface Props {
  ctx: MatchCtx;
  meHome: boolean;
  me: TeamBadge;
  opp: TeamBadge;
  finishing: number;
  composure: number;
  onFinished: (m: MatchState) => void;
}

const EVENT_STYLE: Record<MatchEvent['side'], string> = {
  me: 'border-neon-400/70',
  opp: 'border-crimson-500/70',
  neutral: 'border-white/15',
};

export function LiveMatch({ ctx, meHome, me, opp, finishing, composure, onFinished }: Props) {
  const t = useT();
  const [m, setM] = useState<MatchState>(() => createMatch(ctx, Math.random));
  const [mini, setMini] = useState<{ kind: MiniKind; optionId: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [kick, setKick] = useState<KickKind | null>(null);
  const [last, setLast] = useState<{ kind: 'goal' | 'opp' | null; key: number }>({ kind: null, key: 0 });
  const prevScore = useRef({ my: m.myScore, opp: m.oppScore });

  /* Game clock */
  useEffect(() => {
    if (paused || m.status !== 'playing') return;
    const id = setInterval(() => setM((p) => tickMatch(p, ctx, Math.random)), fast ? 320 : 820);
    return () => clearInterval(id);
  }, [paused, fast, m.status, ctx]);

  /* Goal flashes + haptics */
  useEffect(() => {
    const prev = prevScore.current;
    if (m.myScore > prev.my) {
      setLast((l) => ({ kind: 'goal', key: l.key + 1 }));
      haptic([30, 40, 60]);
    } else if (m.oppScore > prev.opp) {
      setLast((l) => ({ kind: 'opp', key: l.key + 1 }));
      haptic(90);
    }
    prevScore.current = { my: m.myScore, opp: m.oppScore };
  }, [m.myScore, m.oppScore]);

  const moment = m.clutches[m.nextClutch];
  const finished = m.status === 'finished';
  const drawKnockout = finished && ctx.knockout && m.myScore === m.oppScore;

  const pick = (optionId: string) => {
    const r = resolveClutch(m, ctx, optionId, Math.random);
    setM(r.state);
    if (r.mini) setMini({ kind: r.mini, optionId });
    if (r.kick) setKick(r.kick);
  };

  const miniDone = (optionId: string, q: MiniQuality) => {
    setM((prev) => resolveMini(prev, ctx, optionId, q, Math.random).state);
    setMini(null);
  };

  const homeBadge = meHome ? me : opp;
  const awayBadge = meHome ? opp : me;
  const homeScore = meHome ? m.myScore : m.oppScore;
  const awayScore = meHome ? m.oppScore : m.myScore;
  // positive momentum = my team on top; the bar grows toward the dominating club's side
  const leftHot = meHome ? m.momentum > 10 : m.momentum < -10;
  const rightHot = meHome ? m.momentum < -10 : m.momentum > 10;
  const towardLeft = meHome ? m.momentum >= 0 : m.momentum < 0;
  const mineOnTop = m.momentum >= 0;
  const momentumFill = towardLeft
    ? cn('right-1/2 rounded-l-full bg-gradient-to-l', mineOnTop ? 'from-neon-600 to-neon-300' : 'from-crimson-600 to-crimson-400')
    : cn('left-1/2 rounded-r-full bg-gradient-to-r', mineOnTop ? 'from-neon-600 to-neon-300' : 'from-crimson-600 to-crimson-400');

  const events = useMemo(() => [...m.events].reverse().slice(0, 40), [m.events]);

  return (
    <div className="space-y-3">
      {/* Scoreboard */}
      <Card strong gold className="relative overflow-hidden p-4">
        <AnimatePresence>
          {last.kind && (
            <motion.div
              key={last.key}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.1 }}
              className={cn('pointer-events-none absolute inset-0', last.kind === 'goal' ? 'bg-neon-400/30' : 'bg-crimson-500/30')}
            />
          )}
        </AnimatePresence>
        <div className="relative flex items-center justify-between">
          <TeamSide badge={meHome ? me : opp} you={meHome} />
          <div className="text-center">
            <div className="font-num text-[44px] font-extrabold leading-none tracking-tight">
              <motion.span key={`h${homeScore}`} initial={{ scale: 1.5, color: meHome ? '#6ee7b7' : '#fb4b5e' }} animate={{ scale: 1, color: '#fafafa' }} className="inline-block">
                {homeScore}
              </motion.span>
              <span className="mx-1.5 text-zinc-600">–</span>
              <motion.span key={`a${awayScore}`} initial={{ scale: 1.5, color: meHome ? '#fb4b5e' : '#6ee7b7' }} animate={{ scale: 1, color: '#fafafa' }} className="inline-block">
                {awayScore}
              </motion.span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-neon-300">
              {!finished && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson-500" />}
              {finished ? t('FULL TIME') : `${m.minute}'`}
            </div>
          </div>
          <TeamSide badge={meHome ? opp : me} you={!meHome} />
        </div>

        {/* Timeline (clutch moments stay a surprise) */}
        <div className="relative mt-4 h-1.5 rounded-full bg-white/10">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neon-600 to-neon-300" animate={{ width: `${(m.minute / 90) * 100}%` }} transition={{ ease: 'linear' }} />
          <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-white/20" />
        </div>

        {/* Momentum: initials sit under their own club, home on the left */}
        <div className="mt-4">
          <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className={cn('absolute inset-y-0', momentumFill)}
              animate={{ width: `${Math.abs(m.momentum) / 2}%` }}
              transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            />
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
          </div>
          <div className="mt-1 grid grid-cols-3 text-[10px] font-bold uppercase tracking-[0.16em]">
            <span className={cn('text-left', leftHot ? (meHome ? 'text-neon-300' : 'text-crimson-400') : 'text-zinc-600')}>{homeBadge.short}</span>
            <span className="text-center text-zinc-500">{t('Momentum')}</span>
            <span className={cn('text-right', rightHot ? (meHome ? 'text-crimson-400' : 'text-neon-300') : 'text-zinc-600')}>{awayBadge.short}</span>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <Radio className="h-3.5 w-3.5 text-crimson-500" /> {t('Live ticker')}
          {!m.isStarter && <span className="ml-1 rounded bg-gold-400/15 px-1.5 py-0.5 text-[10px] text-gold-300">{t('SUB')}</span>}
        </div>
        {!finished && (
          <div className="flex gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t('Resume') : t('Pause')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 active:scale-90"
            >
              {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
            </button>
            <button
              onClick={() => setFast((f) => !f)}
              aria-pressed={fast}
              aria-label={t('Toggle fast forward')}
              className={cn('flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold active:scale-90', fast ? 'border-neon-400/50 bg-neon-400/15 text-neon-300' : 'border-white/10 bg-white/5 text-zinc-300')}
            >
              <FastForward className="h-3.5 w-3.5" /> {fast ? '2×' : '1×'}
            </button>
          </div>
        )}
      </div>

      {/* Ticker */}
      <div className="space-y-1.5" aria-live="polite">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div
              key={e.id}
              layout="position"
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={cn(
                'flex gap-3 rounded-xl border-l-[3px] bg-white/[0.04] py-2 pl-3 pr-3 text-[13px] leading-snug',
                EVENT_STYLE[e.side],
                e.star && 'bg-gold-400/[0.07]',
                e.type === 'goal' && 'bg-white/[0.08] font-semibold',
              )}
            >
              <span className="font-num w-7 shrink-0 text-sm font-bold text-zinc-500">{e.minute}&apos;</span>
              <span className="text-zinc-200">{e.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {finished && (
        <FloatingAction>
          <Button block size="lg" variant={drawKnockout ? 'gold' : 'primary'} onClick={() => onFinished(m)}>
            {drawKnockout ? t('It’s a draw — penalty shootout!') : t('Full-time — continue')}
          </Button>
        </FloatingAction>
      )}

      <ClutchSheet open={m.status === 'clutch' && !kick && !mini} moment={moment} match={m} ctx={ctx} onPick={pick} />

      {/* Skill mini-games */}
      <Sheet open={!!mini} className="max-h-[94dvh] overflow-y-auto">
        {mini && (
          <MiniGame
            key={`${m.nextClutch}-${mini.optionId}`}
            kind={mini.kind}
            skill={miniSkill(mini.kind, ctx)}
            pressure={pressureFor(m, ctx)}
            difficulty={Math.min(1, Math.max(0, (ctx.oppStr - 55) / 40))}
            onDone={(q) => miniDone(mini.optionId, q)}
          />
        )}
      </Sheet>

      {/* 8-zone goal for penalties & free kicks */}
      <Sheet open={!!kick} className="max-h-[94dvh] overflow-y-auto">
        {kick && (
          <GoalTarget
            key={m.nextClutch}
            kind={kick}
            finishing={finishing}
            composure={composure}
            keeperLevel={ctx.oppStr}
            wallColor={opp.color}
            pressure={pressureFor(m, ctx)}
            title={kick === 'penalty' ? 'Spot Kick' : 'Dead Ball'}
            subtitle={`${m.minute}' · ${homeBadge.name} ${homeScore}–${awayScore} ${awayBadge.name}`}
            onDone={(o) => {
              setM((prev) => applyKick(prev, ctx, kick, o.result, o.curl !== 'straight', o.miss));
              setKick(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function miniSkill(kind: MiniKind, ctx: MatchCtx) {
  switch (kind) {
    case 'power':
    case 'header':
    case 'aim':
      return ctx.attrs.finishing;
    case 'dribble':
      return ctx.attrs.composure;
    case 'memory':
    case 'charge':
      return ctx.attrs.vision;
    default:
      return ctx.attrs.stamina;
  }
}

function TeamSide({ badge, you }: { badge: TeamBadge; you?: boolean }) {
  const t = useT();
  return (
    <div className="flex w-[84px] flex-col items-center gap-1.5 text-center">
      <Crest short={badge.short} color={badge.color} size={48} />
      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-zinc-300">{badge.name}</span>
      {you && <span className="-mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gold-300">{t('You')}</span>}
    </div>
  );
}
