'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crosshair, Gauge, MoveRight, MoveUpRight, MoveUpLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Card';
import { resolveKick, WALL_COLS, ZONE_COUNT, ZONE_NAMES, zoneCol, zoneRow, type KickOutcome, type WallSide } from '@/lib/engine/kick';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import type { Curl, KickKind } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  kind: KickKind;
  finishing: number;
  composure: number;
  /** Opposition strength → keeper quality */
  keeperLevel: number;
  /** 0..1 */
  pressure: number;
  title: string;
  subtitle?: string;
  continueLabel?: string;
  /** Colour of the wall's shirts (the opponent's colour) */
  wallColor?: string;
  onDone: (outcome: KickOutcome) => void;
}

/* Scene geometry (percent of the scene box) */
const GOAL = { left: 6, top: 8, width: 88, height: 44 };

const zoneCenter = (z: number) => ({
  x: GOAL.left + (GOAL.width * (zoneCol(z) + 0.5)) / 4,
  y: GOAL.top + (GOAL.height * (zoneRow(z) + 0.5)) / 2,
});

const RESULT_COPY = {
  goal: { text: 'GOAL!', color: 'text-neon-300', glow: 'drop-shadow-[0_0_18px_rgba(52,211,153,0.9)]' },
  saved: { text: 'SAVED!', color: 'text-crimson-400', glow: 'drop-shadow-[0_0_18px_rgba(239,44,69,0.9)]' },
  missed: { text: 'MISSED!', color: 'text-crimson-400', glow: 'drop-shadow-[0_0_18px_rgba(239,44,69,0.9)]' },
  post: { text: 'POST!', color: 'text-gold-300', glow: 'drop-shadow-[0_0_18px_rgba(242,193,78,0.9)]' },
  bar: { text: 'CROSSBAR!', color: 'text-gold-300', glow: 'drop-shadow-[0_0_18px_rgba(242,193,78,0.9)]' },
  wide: { text: 'WIDE!', color: 'text-crimson-400', glow: 'drop-shadow-[0_0_18px_rgba(239,44,69,0.9)]' },
  over: { text: 'OVER THE BAR!', color: 'text-crimson-400', glow: 'drop-shadow-[0_0_18px_rgba(239,44,69,0.9)]' },
  blocked: { text: 'BLOCKED!', color: 'text-crimson-400', glow: 'drop-shadow-[0_0_18px_rgba(239,44,69,0.9)]' },
} as const;

const MISS_TEXT = {
  post: 'The ball clanged off the post — unlucky!',
  bar: 'The ball smashed against the crossbar!',
  wide: 'The shot dragged wide of the post.',
  over: 'The shot flew over the crossbar.',
} as const;

function pressureLabel(p: number) {
  return p > 0.75 ? 'Nerve-shredding' : p > 0.5 ? 'High' : p > 0.3 ? 'Rising' : 'Calm';
}

const CURLS: { id: Curl; label: string; Icon: typeof MoveRight }[] = [
  { id: 'left', label: 'Curl left', Icon: MoveUpLeft },
  { id: 'straight', label: 'Straight', Icon: MoveRight },
  { id: 'right', label: 'Curl right', Icon: MoveUpRight },
];

export function GoalTarget({ kind, finishing, composure, keeperLevel, pressure, title, subtitle, continueLabel = 'Continue', wallColor = '#2563eb', onDone }: Props) {
  const t = useT();
  const reduce = useReducedMotion();
  const [curl, setCurl] = useState<Curl>('straight');
  // the wall lines up on one side of the goal for the whole kick
  const [wall] = useState<WallSide>(() => (['left', 'center', 'right'] as const)[Math.floor(Math.random() * 3)]);
  const [phase, setPhase] = useState<'aim' | 'flying' | 'revealed'>('aim');
  const [outcome, setOutcome] = useState<KickOutcome | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const shoot = (zone: number) => {
    if (phase !== 'aim') return;
    haptic(18);
    setHover(null);
    const o = resolveKick({ zone, kind, finishing, composure, keeperLevel, pressure, curl, wall: kind === 'freekick' ? wall : undefined }, Math.random);
    setOutcome(o);
    setPhase('flying');
    timer.current = setTimeout(
      () => {
        setPhase('revealed');
        haptic(o.result === 'goal' ? [30, 40, 60] : [120]);
      },
      reduce ? 50 : 820,
    );
  };

  /* Ball destination — misses sail off target */
  const ballTarget = () => {
    if (!outcome) return { left: '50%', top: '93%', scale: 1 };
    const c = zoneCenter(outcome.shotZone);
    if (outcome.result === 'missed') {
      const left = zoneCol(outcome.shotZone) < 2;
      const postX = left ? GOAL.left : GOAL.left + GOAL.width;
      switch (outcome.miss) {
        case 'post':
          return { left: `${postX}%`, top: `${c.y}%`, scale: 0.55 };
        case 'bar':
          return { left: `${c.x}%`, top: `${GOAL.top}%`, scale: 0.55 };
        case 'over':
          return { left: `${c.x + (left ? -3 : 3)}%`, top: '-4%', scale: 0.35 };
        default:
          return { left: left ? '-3%' : '103%', top: `${c.y}%`, scale: 0.45 };
      }
    }
    if (outcome.result === 'blocked') {
      // the ball smacks into a player of the wall: aim for the middle of the covered columns, chest height
      const cols = WALL_COLS[wall];
      const cx = GOAL.left + (GOAL.width * (cols[zoneCol(outcome.shotZone) === cols[0] ? 0 : 1] + 0.5)) / 4;
      return { left: `${cx}%`, top: '60%', scale: 0.8 };
    }
    return { left: `${c.x}%`, top: `${c.y}%`, scale: 0.5 };
  };

  const keeperTarget = () => {
    if (!outcome || phase === 'aim') return { left: '50%', top: '38%', rotate: 0 };
    const c = zoneCenter(outcome.diveZone);
    const col = zoneCol(outcome.diveZone);
    const rot = (col < 2 ? -1 : 1) * (col === 0 || col === 3 ? 62 : 28) * (zoneRow(outcome.diveZone) === 0 ? 1 : 0.9);
    return { left: `${c.x}%`, top: `${c.y + (zoneRow(outcome.diveZone) === 1 ? 2 : 4)}%`, rotate: rot };
  };

  const kt = keeperTarget();
  const bt = ballTarget();
  // Curled free kicks swing out first, then bend back toward the target
  const curved = !!outcome && outcome.curl !== 'straight' && kind === 'freekick';
  const woodwork = outcome?.result === 'missed' && (outcome.miss === 'post' || outcome.miss === 'bar');
  const midLeft = curved && outcome ? `${parseFloat(String(bt.left)) + (outcome.curl === 'left' ? 16 : -16)}%` : bt.left;
  const midTop = curved ? '62%' : bt.top;
  const revealed = phase === 'revealed' && outcome;
  const isGoal = outcome?.result === 'goal';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-gold-300">{t(kind === 'penalty' ? 'Penalty kick' : kind === 'freekick' ? 'Free kick' : 'Shootout')}</div>
          <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{t(title)}</h3>
          {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Chip tone={pressure > 0.6 ? 'bad' : 'gold'}>
            <Gauge className="h-3 w-3" /> {t(pressureLabel(pressure))}
          </Chip>
          <Chip>{t('Composure')} {composure}</Chip>
        </div>
      </div>

      {/* Scene */}
      <div className="relative aspect-[16/11] w-full select-none overflow-hidden rounded-3xl border border-white/10 bg-[#04120c]">
        <PitchBackdrop kind={kind} />

        {/* Goal frame */}
        <div
          className="goal-net absolute rounded-t-md border-x-[5px] border-t-[5px] border-zinc-100/90 bg-black/50 shadow-[0_0_40px_-8px_rgba(255,255,255,0.25)]"
          style={{ left: `${GOAL.left}%`, top: `${GOAL.top}%`, width: `${GOAL.width}%`, height: `${GOAL.height}%` }}
        >
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-2">
            {Array.from({ length: ZONE_COUNT }, (_, z) => {
              const corner = z === 0 || z === 3 || z === 4 || z === 7;
              const isShot = outcome?.shotZone === z;
              const isDive = outcome?.diveZone === z;
              return (
                <button
                  key={z}
                  onClick={() => shoot(z)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(z)}
                  onPointerLeave={() => setHover(null)}
                  disabled={phase !== 'aim'}
                  aria-label={`${t('Shoot')} ${t(ZONE_NAMES[z])}`}
                  className={cn(
                    'group relative flex items-center justify-center border border-white/[0.14] outline-none transition-colors',
                    phase === 'aim' && 'cursor-crosshair hover:bg-neon-400/20 active:bg-neon-400/35',
                    phase !== 'aim' && !isShot && !isDive && 'opacity-60',
                  )}
                >
                  {phase === 'aim' && (
                    <Crosshair
                      className={cn(
                        'h-5 w-5 transition-all',
                        hover === z ? 'scale-125 text-neon-300 opacity-100' : 'text-white opacity-25',
                      )}
                    />
                  )}
                  {phase === 'aim' && corner && hover !== z && <span className="absolute right-1 top-0.5 text-[8px] font-bold text-gold-300/60">★</span>}
                  {isDive && phase !== 'aim' && (
                    <span className="absolute inset-1 rounded-md border border-dashed border-white/50" aria-hidden />
                  )}
                  {revealed && isShot && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'absolute inset-0.5 rounded-md ring-2',
                        isGoal ? 'bg-neon-500/45 ring-neon-300 shadow-neon' : 'bg-crimson-500/45 ring-crimson-400 shadow-crimson',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {revealed && outcome?.result === 'missed' && (outcome.miss === 'post' || outcome.miss === 'bar') && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute z-[9] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-300"
            style={{
              left: `${outcome.miss === 'post' ? (zoneCol(outcome.shotZone) < 2 ? GOAL.left : GOAL.left + GOAL.width) : zoneCenter(outcome.shotZone).x}%`,
              top: `${outcome.miss === 'post' ? zoneCenter(outcome.shotZone).y : GOAL.top}%`,
            }}
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
        {kind === 'freekick' && <Wall side={wall} color={wallColor} phase={phase} result={outcome?.result} />}
        {kind === 'freekick' && phase === 'aim' && hover !== null && <TrajectoryPreview zone={hover} curl={curl} />}

        {/* Keeper */}
        <motion.div
          className="pointer-events-none absolute z-10"
          style={{ x: '-50%', y: '-50%' }}
          initial={{ left: '50%', top: '38%', rotate: 0 }}
          animate={{ left: kt.left, top: kt.top, rotate: kt.rotate }}
          transition={reduce ? { duration: 0 } : phase === 'aim' ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 15, delay: 0.12 }}
        >
          <svg width="46" height="58" viewBox="0 0 46 58" aria-hidden className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
            <rect x="15" y="40" width="7" height="16" rx="3" fill="#18181b" />
            <rect x="24" y="40" width="7" height="16" rx="3" fill="#18181b" />
            <rect x="12" y="16" width="22" height="27" rx="7" fill="#f2c14e" />
            <rect x="2" y="18" width="9" height="22" rx="4.500" fill="#d9a42b" transform="rotate(14 6 18)" />
            <rect x="35" y="18" width="9" height="22" rx="4.500" fill="#d9a42b" transform="rotate(-14 40 18)" />
            <circle cx="5" cy="40" r="5" fill="#34d399" />
            <circle cx="41" cy="40" r="5" fill="#34d399" />
            <circle cx="23" cy="9" r="7" fill="#fcd9b6" />
          </svg>
        </motion.div>

        {/* Ball */}
        <motion.div
          className="pointer-events-none absolute z-20 h-7 w-7"
          style={{ x: '-50%', y: '-50%' }}
          initial={{ left: '50%', top: '93%', scale: 1 }}
          animate={
            phase === 'aim'
              ? { left: '50%', top: '93%', scale: 1 }
              : woodwork && outcome
                ? {
                    // clangs off the woodwork and bounces back into play
                    left: ['50%', bt.left, `${parseFloat(String(bt.left)) + (zoneCol(outcome.shotZone) < 2 ? 7 : -7)}%`],
                    top: ['93%', bt.top, outcome.miss === 'bar' ? '36%' : '68%'],
                    scale: [1, bt.scale, 0.8],
                  }
                : curved
                  ? { left: ['50%', midLeft, bt.left], top: ['93%', midTop, bt.top], scale: [1, 0.8, bt.scale] }
                  : { left: bt.left, top: bt.top, scale: bt.scale }
          }
          transition={reduce ? { duration: 0 } : { duration: curved ? 0.75 : 0.55, ease: curved ? 'easeInOut' : [0.2, 0.7, 0.3, 1] }}
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d4d4d8_55%,#52525b)] shadow-[0_6px_12px_rgba(0,0,0,0.7)]" />
          <svg viewBox="0 0 28 28" className="absolute inset-0" aria-hidden>
            <path d="M14 8l5 3.700-1.900 5.800h-6.200L9 11.700z" fill="#18181b" opacity=".85" />
          </svg>
        </motion.div>

        {/* Result banner */}
        <AnimatePresence>
          {revealed && outcome && (
            <motion.div
              key="banner"
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="pointer-events-none absolute inset-x-0 top-[58%] z-30 text-center"
            >
              <span className={cn('font-display text-6xl font-extrabold italic tracking-tight', RESULT_COPY[outcome.result === 'missed' && outcome.miss ? outcome.miss : outcome.result].color, RESULT_COPY[outcome.result === 'missed' && outcome.miss ? outcome.miss : outcome.result].glow)}>
                {t(RESULT_COPY[outcome.result === 'missed' && outcome.miss ? outcome.miss : outcome.result].text)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result flash */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className={cn('pointer-events-none absolute inset-0 z-[5]', isGoal ? 'bg-neon-400/40' : 'bg-crimson-500/40')}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="min-h-[76px]">
        {phase === 'aim' && (
          <div className="space-y-2 text-center">
            {kind === 'freekick' && (
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t('Spin')}</div>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
                  {CURLS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setCurl(id);
                        haptic(8);
                      }}
                      aria-pressed={curl === id}
                      className={cn(
                        'flex h-9 items-center justify-center gap-1 rounded-xl text-xs font-bold transition-all',
                        curl === id ? 'bg-gradient-to-b from-gold-300 to-gold-500 text-zinc-950' : 'text-zinc-400',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" /> {t(label)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm font-semibold text-zinc-200">{hover !== null ? t(ZONE_NAMES[hover]) : t('Tap a zone to take the shot')}</p>
            <p className="text-xs text-zinc-500">
              {t('★ Corners are harder to save — but easier to miss.')}
              {kind === 'freekick' ? ` ${t('Low shots risk the wall.')}` : ''}
            </p>
            {kind === 'freekick' && (
              <p className="text-xs text-zinc-500">
                {t(wall === 'left' ? 'The wall covers the left of the goal.' : wall === 'right' ? 'The wall covers the right of the goal.' : 'The wall covers the middle of the goal.')}{' '}
                {t('Bend the ball toward the side you aim at to beat the wall and fool the keeper.')}
              </p>
            )}
          </div>
        )}
        {phase === 'flying' && <p className="pt-3 text-center text-sm font-semibold text-zinc-400">{t('Struck… the keeper is diving…')}</p>}
        {revealed && outcome && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-2">
            {outcome.result === 'missed' && outcome.miss && (
              <p className="text-center text-sm font-semibold text-zinc-200">{t(MISS_TEXT[outcome.miss])}</p>
            )}
            {outcome.result === 'blocked' && <p className="text-center text-sm font-semibold text-zinc-200">{t('The shot hit the wall.')}</p>}
            <p className="text-center text-xs text-zinc-400">
              {t('You aimed')} <span className="font-semibold text-zinc-200">{t(ZONE_NAMES[outcome.shotZone])}</span> · {t('keeper dived')}{' '}
              <span className="font-semibold text-zinc-200">{t(ZONE_NAMES[outcome.diveZone])}</span>
            </p>
            <Button block size="lg" variant={isGoal ? 'primary' : 'ghost'} onClick={() => onDone(outcome)}>
              {t(continueLabel)}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ───────── Scene pieces ───────── */

/** Striped pitch in perspective with the penalty area, the goal line and (free kicks) the referee's spray. */
function PitchBackdrop({ kind }: { kind: KickKind }) {
  return (
    <svg aria-hidden viewBox="0 0 160 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="gt-stand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0c10" />
          <stop offset="1" stopColor="#14141a" />
        </linearGradient>
        <linearGradient id="gt-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".55" />
          <stop offset=".5" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* stands and advertising boards */}
      <rect width="160" height="9" fill="url(#gt-stand)" />
      <g opacity=".9">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={i * 20 + 1} y="5.200" width="18" height="3.200" rx=".6" fill={['#064e3b', '#78350f', '#1e3a8a', '#4c1d95'][i % 4]} />
        ))}
      </g>
      {/* grass bands: they get taller toward the viewer */}
      <rect y="9" width="160" height="101" fill="#0b3b27" />
      {[
        [9, 7],
        [22, 9],
        [38, 12],
        [58, 16],
        [84, 26],
      ].map(([y, h], i) => (
        <rect key={i} y={y} width="160" height={h} fill={i % 2 ? '#0e4a31' : '#0a3623'} />
      ))}
      {/* penalty area & six-yard box in perspective */}
      <g fill="none" stroke="rgba(255,255,255,.28)" strokeWidth=".7">
        <path d="M10 57 L2 110 M150 57 L158 110" />
        <path d="M42 57 L34 78 L126 78 L118 57" />
        <path d="M60 78 Q80 86 100 78" strokeOpacity=".5" />
        <path d="M0 57 L160 57" strokeWidth=".9" strokeOpacity=".4" />
      </g>
      {kind !== 'freekick' && <circle cx="80" cy="102" r="1.100" fill="rgba(255,255,255,.55)" />}
      {/* the referee's vanishing spray where the wall stands */}
      {kind === 'freekick' && <path d="M22 88.500 Q80 83 138 88.500" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="1.100" strokeDasharray="3 2.200" strokeLinecap="round" />}
      <rect width="160" height="110" fill="url(#gt-fade)" />
    </svg>
  );
}

/** Five defenders, arms crossed, lined up on the spray. They hop when the ball is struck. */
function Wall({ side, color, phase, result }: { side: WallSide; color: string; phase: 'aim' | 'flying' | 'revealed'; result?: string }) {
  const cols = WALL_COLS[side];
  const left = GOAL.left + (GOAL.width * cols[0]) / 4;
  const width = GOAL.width / 2;
  const hop = phase !== 'aim' && result !== 'blocked';
  return (
    <div aria-hidden className="pointer-events-none absolute z-[8]" style={{ left: `${left}%`, width: `${width}%`, top: '34%', height: '50%' }}>
      <div className="absolute -bottom-[3%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white/70">9.15 m</div>
      <div className="flex h-full items-end justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.svg
            key={i}
            viewBox="0 0 20 66"
            className="h-full"
            style={{ width: '20%' }}
            animate={hop ? { y: ['0%', '-9%', '0%'] } : { y: '0%' }}
            transition={hop ? { duration: 0.55, delay: 0.1 + i * 0.025, ease: 'easeOut' } : { duration: 0 }}
          >
            <ellipse cx="10" cy="64" rx="8" ry="1.800" fill="rgba(0,0,0,.45)" />
            {/* legs & shorts */}
            <rect x="5.200" y="42" width="4.200" height="22" rx="2" fill="#f4f4f5" />
            <rect x="10.600" y="42" width="4.200" height="22" rx="2" fill="#f4f4f5" />
            <rect x="4.500" y="55" width="5" height="9" rx="1.600" fill="#18181b" />
            <rect x="10.500" y="55" width="5" height="9" rx="1.600" fill="#18181b" />
            <rect x="4" y="33" width="12" height="13" rx="3" fill="#e4e4e7" />
            {/* shirt */}
            <rect x="3" y="14" width="14" height="23" rx="5" fill={i % 2 ? color : color} />
            <rect x="3" y="14" width="14" height="23" rx="5" fill="url(#gt-fade)" opacity=".35" />
            <rect x="9" y="14" width="2" height="23" fill="rgba(255,255,255,.18)" />
            {/* arms crossed over the groin */}
            <rect x="2" y="17" width="3" height="16" rx="1.500" fill="#e8c4a0" />
            <rect x="15" y="17" width="3" height="16" rx="1.500" fill="#e8c4a0" />
            <rect x="5" y="31" width="10" height="4" rx="2" fill="#e8c4a0" />
            {/* head */}
            <rect x="8.200" y="11" width="3.600" height="4" fill="#d9b18c" />
            <circle cx="10" cy="8" r="5.200" fill="#e8c4a0" />
            <path d="M4.800 7.500a5.200 5.200 0 0110.400 0c-2.800-2.300-7.600-2.300-10.400 0z" fill={['#2a1a10', '#caa24a', '#1a1410', '#5a3a22', '#0f0f0f'][i]} />
          </motion.svg>
        ))}
      </div>
    </div>
  );
}

/** Dashed preview of the ball's path to the zone under the cursor, bent by the chosen spin. */
function TrajectoryPreview({ zone, curl }: { zone: number; curl: Curl }) {
  const c = zoneCenter(zone);
  const sx = 50;
  const sy = 93;
  const bend = curl === 'left' ? 20 : curl === 'right' ? -20 : 0;
  // control point: halfway up, pushed sideways opposite to the final curl direction
  const cx = (sx + c.x) / 2 + bend;
  const cy = (sy + c.y) / 2 + 6;
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[6] h-full w-full">
      <path d={`M${sx} ${sy} Q${cx} ${cy} ${c.x} ${c.y}`} fill="none" stroke="rgba(242,193,78,.85)" strokeWidth="0.9" strokeDasharray="2.200 1.800" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={c.x} cy={c.y} r="1.600" fill="rgba(242,193,78,.9)" />
    </svg>
  );
}
