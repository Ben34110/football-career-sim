'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crosshair, Gauge, MoveRight, MoveUpRight, MoveUpLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Card';
import { resolveKick, ZONE_COUNT, ZONE_NAMES, zoneCol, zoneRow, type KickOutcome } from '@/lib/engine/kick';
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
  blocked: { text: 'BLOCKED!', color: 'text-crimson-400', glow: 'drop-shadow-[0_0_18px_rgba(239,44,69,0.9)]' },
} as const;

function pressureLabel(p: number) {
  return p > 0.75 ? 'Nerve-shredding' : p > 0.5 ? 'High' : p > 0.3 ? 'Rising' : 'Calm';
}

const CURLS: { id: Curl; label: string; Icon: typeof MoveRight }[] = [
  { id: 'left', label: 'Curl left', Icon: MoveUpLeft },
  { id: 'straight', label: 'Straight', Icon: MoveRight },
  { id: 'right', label: 'Curl right', Icon: MoveUpRight },
];

export function GoalTarget({ kind, finishing, composure, keeperLevel, pressure, title, subtitle, continueLabel = 'Continue', onDone }: Props) {
  const t = useT();
  const reduce = useReducedMotion();
  const [curl, setCurl] = useState<Curl>('straight');
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
    const o = resolveKick({ zone, kind, finishing, composure, keeperLevel, pressure, curl }, Math.random);
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
      const top = zoneRow(outcome.shotZone) === 0;
      return top
        ? { left: `${c.x + (zoneCol(outcome.shotZone) < 2 ? -3 : 3)}%`, top: '-2%', scale: 0.4 }
        : { left: zoneCol(outcome.shotZone) < 2 ? '-2%' : '102%', top: `${c.y}%`, scale: 0.45 };
    }
    if (outcome.result === 'blocked') return { left: `${c.x}%`, top: '72%', scale: 0.7 };
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
      <div className="relative aspect-[16/11] w-full select-none overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(16,224,138,0.22),rgba(6,78,59,0.18)_45%,#050a08_85%)]">
        <div aria-hidden className="pitch-lines absolute inset-0 opacity-40 [mask-image:linear-gradient(to_top,black,transparent_75%)]" />
        {/* penalty spot & box lines */}
        <div aria-hidden className="absolute left-[3%] right-[3%] top-[56%] h-px bg-white/15" />
        <div aria-hidden className="absolute left-1/2 top-[88%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/30" />

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
                  onPointerEnter={() => setHover(z)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(z)}
                  disabled={phase !== 'aim'}
                  aria-label={`${t('Shoot')} ${t(ZONE_NAMES[z])}`}
                  className={cn(
                    'group relative flex items-center justify-center border border-white/[0.14] outline-none transition-colors',
                    phase === 'aim' && 'cursor-crosshair hover:bg-neon-400/20 focus-visible:bg-neon-400/20 active:bg-neon-400/35',
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

          {/* Wall (free kicks) */}
          {kind === 'freekick' && (
            <div className="pointer-events-none absolute inset-x-[22%] bottom-0 flex h-[55%] items-end justify-between" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-zinc-400" />
                  <div className="h-[34px] w-[18px] rounded-t-md bg-gradient-to-b from-zinc-500 to-zinc-700" />
                </div>
              ))}
            </div>
          )}
        </div>

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
              <span className={cn('font-display text-6xl font-extrabold italic tracking-tight', RESULT_COPY[outcome.result].color, RESULT_COPY[outcome.result].glow)}>
                {t(RESULT_COPY[outcome.result].text)}
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
            {kind === 'freekick' && <p className="text-xs text-zinc-500">{t('Bend the ball toward the side you aim at to beat the wall and fool the keeper.')}</p>}
          </div>
        )}
        {phase === 'flying' && <p className="pt-3 text-center text-sm font-semibold text-zinc-400">{t('Struck… the keeper is diving…')}</p>}
        {revealed && outcome && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-2">
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
