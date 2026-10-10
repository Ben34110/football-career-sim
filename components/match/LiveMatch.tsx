'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { FastForward, Pause, Play, Radio } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { Sheet } from '@/components/ui/Sheet';
import { applyKick, applyRally, createMatch, MENTALITY, setMentality, pressureFor, rallyChance, rallyKind, rallyOptions, resolveClutch, resolveMini, tickMatch, type MatchCtx } from '@/lib/engine/match';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { liveTable, scoreAt, type OtherGame } from '@/lib/engine/livefeed';
import { sortTable } from '@/lib/engine/season';
import type { FixtureKind, KickKind, Mentality, MatchEvent, MiniKind, MiniQuality, MatchState, TableRow } from '@/lib/types';
import { cn, flagOnly } from '@/lib/utils';
import { ClutchSheet } from './ClutchSheet';
import { GoalTarget } from './GoalTarget';
import { MiniGame } from './MiniGame';

export interface TeamBadge {
  name: string;
  short: string;
  color: string;
  /** Where the side stands, shown above the crest ("#3 · 21 pts") */
  rank?: string;
}

export interface LiveBoard {
  /** The table being fought over (league, or the European group); null for knockouts */
  table: TableRow[] | null;
  games: OtherGame[];
  opponent: string;
  /** Title of the table ("Group A") and of the other games (tournament name), already translated */
  heading?: string;
  gamesTitle?: string;
}

const MENTALITY_LABEL: Record<Mentality, string> = { attack: 'Attack', balanced: 'Normal', defend: 'Defend' };
const MENTALITY_ICON: Record<Mentality, string> = { attack: '⚔️', balanced: '⚖️', defend: '🛡️' };

const COMPETITION_LABEL: Record<FixtureKind, string> = {
  league: 'League',
  cup: 'Domestic Cup',
  intl: 'International',
  tournament: 'Tournament',
  euro: 'Europe',
};

interface Props {
  ctx: MatchCtx;
  competition: { kind: FixtureKind; label: string };
  board: LiveBoard;
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

export function LiveMatch({ ctx, competition, board, meHome, me, opp, finishing, composure, onFinished }: Props) {
  const t = useT();
  const [m, setM] = useState<MatchState>(() => createMatch(ctx, Math.random));
  const [mini, setMini] = useState<{ kind: MiniKind; optionId: string } | null>(null);
  const [rallyOpen, setRallyOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [menOpen, setMenOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [kick, setKick] = useState<KickKind | null>(null);
  const [last, setLast] = useState<{ kind: 'goal' | 'opp' | null; key: number }>({ kind: null, key: 0 });
  const prevScore = useRef({ my: m.myScore, opp: m.oppScore });

  /* Game clock */
  useEffect(() => {
    if (paused || rallyOpen || boardOpen || m.status !== 'playing') return;
    const id = setInterval(() => setM((p) => tickMatch(p, ctx, Math.random)), fast ? 320 : 820);
    return () => clearInterval(id);
  }, [paused, rallyOpen, boardOpen, fast, m.status, ctx]);

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

  const rally = rallyKind(m, ctx);

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
        <div className="relative mb-3 flex items-center justify-center">
          <span className="flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-300">
            {competition.kind === 'euro' ? '⭐' : competition.kind === 'cup' ? '🏆' : competition.kind === 'league' ? '⚽' : '🌍'}
            {competition.kind === 'euro' ? t(competition.label) : `${t(COMPETITION_LABEL[competition.kind])} · ${t(competition.label)}`}
          </span>
        </div>
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-zinc-500">
          <Radio className="h-3.5 w-3.5 shrink-0 text-crimson-500" />
          {!m.isStarter && <span className="rounded bg-gold-400/15 px-1.5 py-0.5 text-[10px] text-gold-300">{t('SUB')}</span>}
          {!finished && (
            <div className="relative">
              <button
                onClick={() => setMenOpen((o) => !o)}
                aria-expanded={menOpen}
                aria-label={t('Team mentality')}
                className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-[11px] font-bold text-zinc-300 active:scale-95"
              >
                {MENTALITY_ICON[m.mentality ?? 'balanced']} {t(MENTALITY_LABEL[m.mentality ?? 'balanced'])}
              </button>
              {menOpen && (
                <>
                  <button aria-hidden tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setMenOpen(false)} />
                  <div className="absolute left-0 top-full z-30 mt-2 flex gap-1 rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-xl backdrop-blur-xl">
                    {(['attack', 'balanced', 'defend'] as Mentality[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          haptic(12);
                          setM((prev) => setMentality(prev, ctx, mode));
                          setMenOpen(false);
                        }}
                        className={cn('flex h-9 items-center gap-1 rounded-xl px-2.5 text-[12px] font-bold', (m.mentality ?? 'balanced') === mode ? 'bg-white/15 text-zinc-50' : 'text-zinc-400')}
                      >
                        {MENTALITY_ICON[mode]} {t(MENTALITY_LABEL[mode])}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {!finished && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                haptic(10);
                setBoardOpen(true);
              }}
              aria-label={t(board.table ? 'Live table' : 'Other matches')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base active:scale-90"
            >
              📊
            </button>
            {rally && (
              <motion.button
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                onClick={() => {
                  haptic(15);
                  setRallyOpen(true);
                }}
                aria-label={t('Rally')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/60 bg-gold-400/15 text-base"
              >
                📣
              </motion.button>
            )}
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
              className={cn('flex h-9 items-center gap-1 rounded-full border px-2.5 text-xs font-bold active:scale-90', fast ? 'border-neon-400/50 bg-neon-400/15 text-neon-300' : 'border-white/10 bg-white/5 text-zinc-300')}
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

      {/* Live standings and the other games being played right now */}
      <Sheet open={boardOpen} dismissible onClose={() => setBoardOpen(false)} className="max-h-[88dvh] overflow-y-auto">
        <LiveBoardView board={board} myScore={m.myScore} oppScore={m.oppScore} minute={m.minute} finished={finished} />
        <Button block variant="ghost" className="mt-4" onClick={() => setBoardOpen(false)}>
          {t('Back to the match')}
        </Button>
      </Sheet>

      {/* Team boost when you are losing or tired */}
      <Sheet open={rallyOpen && !!rally} dismissible onClose={() => setRallyOpen(false)}>
        {rally && (
          <div>
            <div className="eyebrow text-gold-300">{t('Time to react')}</div>
            <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{t('Lift the team')}</h3>
            <p className="mt-1 text-sm text-zinc-400">{t('One chance per match. How do you react?')}</p>
            <div className="mt-4 space-y-2.5">
              {rallyOptions(rally).map((o) => {
                const chance = rallyChance(o, ctx);
                return (
                  <button
                    key={o.id}
                    onClick={() => {
                      setM((prev) => applyRally(prev, ctx, rally, o.id, Math.random));
                      setRallyOpen(false);
                    }}
                    className="gloss-edge glass flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.98]"
                  >
                    <span className="text-2xl">{o.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold">{t(o.label)}</span>
                      <span className="block text-xs text-zinc-400">{t(o.hint)}</span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                        <span className={cn('block h-full rounded-full', chance > 0.6 ? 'bg-neon-400' : chance > 0.4 ? 'bg-gold-400' : 'bg-crimson-500')} style={{ width: `${Math.round(chance * 100)}%` }} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Sheet>

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
      {badge.rank && (
        <span className={cn('whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none', you ? 'border-neon-400/40 bg-neon-400/10 text-neon-300' : 'border-white/15 bg-white/[0.06] text-zinc-300')}>{badge.rank}</span>
      )}
      <Crest short={badge.short} color={badge.color} size={48} />
      <span className="line-clamp-2 min-h-[2.5em] text-[11px] font-bold leading-tight text-zinc-300">{badge.name}</span>
      {/* always takes its line, so both crests sit at the same height */}
      <span className={cn('-mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gold-300', !you && 'invisible')}>{t('You')}</span>
    </div>
  );
}

function LiveBoardView({ board, myScore, oppScore, minute, finished }: { board: LiveBoard; myScore: number; oppScore: number; minute: number; finished: boolean }) {
  const t = useT();
  const clock = finished ? t('FT') : `${minute}'`;
  const live = board.table ? sortTable(liveTable(board.table, board.opponent, myScore, oppScore, board.games, minute)) : null;
  const before = board.table ? sortTable(board.table) : null;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{board.heading ?? t(board.table ? 'Live table' : 'Other matches')}</h3>
        <span className="font-num text-sm font-bold text-crimson-400">● {clock}</span>
      </div>

      {live && before && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
          <div className="grid grid-cols-[24px_16px_1fr_26px_26px_34px] items-center gap-1 border-b border-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span>#</span>
            <span />
            <span>{t('Club')}</span>
            <span className="text-center">{t('P')}</span>
            <span className="text-center">{t('GD')}</span>
            <span className="text-right">{t('Pts')}</span>
          </div>
          {live.map((r, i) => {
            const was = before.findIndex((x) => x.id === r.id);
            const move = was - i;
            return (
              <div key={r.id} className={cn('grid grid-cols-[24px_16px_1fr_26px_26px_34px] items-center gap-1 px-3 py-2 text-[13px]', r.isMe ? 'bg-neon-400/10 font-bold text-neon-300' : 'border-t border-white/[0.04] text-zinc-300')}>
                <span className="font-num text-zinc-500">{i + 1}</span>
                <span className={cn('text-[10px] font-bold', move > 0 ? 'text-neon-400' : move < 0 ? 'text-crimson-400' : 'text-zinc-700')}>{move > 0 ? '▲' : move < 0 ? '▼' : '–'}</span>
                <span className="truncate">{flagOnly(r.short) ? `${flagOnly(r.short)} ` : ''}{t(r.name)}</span>
                <span className="font-num text-center">{r.played}</span>
                <span className="font-num text-center">
                  {r.gf - r.ga > 0 ? '+' : ''}
                  {r.gf - r.ga}
                </span>
                <span className="font-num text-right text-base font-extrabold">{r.pts}</span>
              </div>
            );
          })}
        </div>
      )}

      {board.games.length > 0 && (
        <div>
          <div className="eyebrow mb-2">{board.gamesTitle ?? t('Elsewhere right now')}</div>
          <div className="space-y-1.5">
            {board.games.map((g) => {
              const [h, a] = scoreAt(g, minute);
              return (
                <div key={g.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-right font-semibold">{t(g.home)} {flagOnly(g.homeShort)}</span>
                  <span className="font-num min-w-[52px] rounded-md bg-black/40 px-2 py-0.5 text-center font-extrabold">
                    {h} – {a}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{flagOnly(g.awayShort)} {t(g.away)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!live && board.games.length === 0 && <p className="text-sm text-zinc-500">{t('No other matches at the moment.')}</p>}
    </div>
  );
}
