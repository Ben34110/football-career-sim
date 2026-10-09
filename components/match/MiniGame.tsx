'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp, Gauge, Hand, Swords, Target, Wind } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Chip } from '@/components/ui/Card';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import type { MiniKind, MiniQuality } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  kind: MiniKind;
  /** The attribute that drives this mini-game (widens the sweet spot) */
  skill: number;
  /** 0..1 — makes everything faster */
  pressure: number;
  onDone: (q: MiniQuality) => void;
}

const META: Record<MiniKind, { title: string; how: string; icon: typeof Target }> = {
  power: { title: 'Power Shot', how: 'Stop the cursor inside the gold zone.', icon: Target },
  header: { title: 'Aerial Duel', how: 'Tap when the ring closes on the ball.', icon: Wind },
  tackle: { title: 'Last-Ditch Tackle', how: 'Wait for the green flash — then tap instantly.', icon: Swords },
  dribble: { title: 'Skill Run', how: 'Follow the arrows before they vanish.', icon: Hand },
};

const QUALITY_COPY: Record<MiniQuality, { text: string; color: string }> = {
  perfect: { text: 'PERFECT!', color: 'text-gold-300' },
  good: { text: 'GOOD', color: 'text-neon-300' },
  miss: { text: 'MISSED', color: 'text-crimson-400' },
};

export function MiniGame({ kind, skill, pressure, onDone }: Props) {
  const t = useT();
  const [result, setResult] = useState<MiniQuality | null>(null);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = META[kind];
  const Icon = meta.icon;
  /** −0.02 … +0.1: better players get a more forgiving sweet spot */
  const bonus = Math.max(-0.02, Math.min(0.1, (skill - 65) / 350));

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const finish = useCallback(
    (q: MiniQuality) => {
      if (done.current) return;
      done.current = true;
      setResult(q);
      haptic(q === 'miss' ? [90] : q === 'perfect' ? [30, 40, 60] : 25);
      timer.current = setTimeout(() => onDoneRef.current(q), 1100);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-gold-300">{t('Skill moment')}</div>
          <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{t(meta.title)}</h3>
          <p className="mt-1 text-xs text-zinc-400">{t(meta.how)}</p>
        </div>
        <Chip tone="gold">
          <Icon className="h-3 w-3" /> {skill}
        </Chip>
      </div>

      <div className="relative">
        {kind === 'power' && <PowerBar bonus={bonus} pressure={pressure} onStop={finish} locked={!!result} />}
        {kind === 'header' && <RingGame bonus={bonus} pressure={pressure} onStop={finish} locked={!!result} />}
        {kind === 'tackle' && <ReactionGame bonus={bonus} pressure={pressure} onStop={finish} locked={!!result} />}
        {kind === 'dribble' && <DribbleGame bonus={bonus} pressure={pressure} onStop={finish} locked={!!result} />}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <span className={cn('font-display text-6xl font-extrabold italic tracking-tight drop-shadow-[0_0_18px_rgba(0,0,0,0.8)]', QUALITY_COPY[result].color)}>
                {t(QUALITY_COPY[result].text)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface GameProps {
  bonus: number;
  pressure: number;
  locked: boolean;
  onStop: (q: MiniQuality) => void;
}

/* ───────── Power shot: sweet-spot bar ───────── */

function PowerBar({ bonus, pressure, onStop, locked }: GameProps) {
  const t = useT();
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const [center] = useState(() => 0.3 + Math.random() * 0.4);
  const perfect = 0.045 + bonus * 0.35;
  const good = 0.13 + bonus;

  useEffect(() => {
    if (locked) return;
    const speed = 0.85 + pressure * 0.6; // traversals per second
    let raf = 0;
    let last = performance.now();
    let phase = Math.random();
    const loop = (now: number) => {
      phase = (phase + ((now - last) / 1000) * speed) % 2;
      last = now;
      const p = phase <= 1 ? phase : 2 - phase;
      posRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locked, pressure]);

  const stop = () => {
    if (locked) return;
    const d = Math.abs(posRef.current - center);
    onStop(d <= perfect ? 'perfect' : d <= good ? 'good' : 'miss');
  };

  return (
    <div className="space-y-4">
      <div className="relative h-24 select-none overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-4">
        <div className="relative mt-5 h-5 rounded-full bg-white/[0.08]">
          <div className="absolute inset-y-0 rounded-full bg-neon-400/35" style={{ left: `${(center - good) * 100}%`, width: `${good * 200}%` }} />
          <div className="absolute inset-y-0 rounded-full bg-gold-400" style={{ left: `${(center - perfect) * 100}%`, width: `${perfect * 200}%` }} />
          <div className="absolute -top-3 h-11 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" style={{ left: `${pos * 100}%` }} />
        </div>
        <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          <span>{t('Weak')}</span>
          <span>{t('Power')}</span>
        </div>
      </div>
      <TapButton onClick={stop} disabled={locked} label={t('STRIKE!')} />
    </div>
  );
}

/* ───────── Header: closing ring ───────── */

function RingGame({ bonus, pressure, onStop, locked }: GameProps) {
  const t = useT();
  const [r, setR] = useState(1);
  const rRef = useRef(1);
  const total = 1500 - pressure * 450;
  const perfect = 0.07 + bonus * 0.4;
  const good = 0.2 + bonus;

  useEffect(() => {
    if (locked) return;
    let raf = 0;
    const start = performance.now() + 500; // short run-up before the ring starts closing
    const loop = (now: number) => {
      const p = Math.max(0, (now - start) / total);
      const v = 1 - p; // 1 → 0
      rRef.current = v;
      setR(Math.max(v, 0));
      if (p >= 1.12) {
        onStop('miss');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locked, total, onStop]);

  const stop = () => {
    if (locked) return;
    // target ring sits at ~0.18 of the starting radius
    const d = Math.abs(rRef.current - 0.18);
    onStop(d <= perfect ? 'perfect' : d <= good ? 'good' : 'miss');
  };

  const size = 200;
  return (
    <div className="space-y-4">
      <div className="relative mx-auto flex h-[230px] w-full select-none items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <div className="absolute rounded-full border-[3px] border-gold-400 shadow-[0_0_18px_rgba(242,193,78,0.6)]" style={{ width: size * 0.36, height: size * 0.36 }} />
        <div
          className="absolute rounded-full border-[3px]"
          style={{ width: size * Math.max(r, 0.02), height: size * Math.max(r, 0.02), borderColor: Math.abs(r - 0.18) <= good ? '#34d399' : '#a1a1aa' }}
        />
        <div className="relative h-8 w-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d4d4d8_55%,#52525b)] shadow-[0_6px_12px_rgba(0,0,0,0.7)]" />
      </div>
      <TapButton onClick={stop} disabled={locked} label={t('JUMP!')} />
    </div>
  );
}

/* ───────── Tackle: reaction time ───────── */

function ReactionGame({ bonus, pressure, onStop, locked }: GameProps) {
  const t = useT();
  const [go, setGo] = useState(false);
  const goAt = useRef(0);
  const perfect = 230 + bonus * 900;
  const good = 480 + bonus * 1200 - pressure * 80;

  useEffect(() => {
    if (locked) return;
    const wait = 900 + Math.random() * 1700;
    const id = setTimeout(() => {
      goAt.current = performance.now();
      setGo(true);
    }, wait);
    return () => clearTimeout(id);
  }, [locked]);

  // Give up if the player sleeps through the signal
  useEffect(() => {
    if (!go || locked) return;
    const id = setTimeout(() => onStop('miss'), good + 350);
    return () => clearTimeout(id);
  }, [go, locked, good, onStop]);

  const tap = () => {
    if (locked) return;
    if (!go) return onStop('miss'); // jumped in too early
    const ms = performance.now() - goAt.current;
    onStop(ms <= perfect ? 'perfect' : ms <= good ? 'good' : 'miss');
  };

  return (
    <div className="space-y-4">
      <motion.div
        animate={{ backgroundColor: go ? 'rgba(16,185,129,0.55)' : 'rgba(0,0,0,0.4)', scale: go ? 1.02 : 1 }}
        transition={{ duration: 0.08 }}
        className="flex h-[190px] select-none items-center justify-center rounded-3xl border border-white/10"
      >
        <span className={cn('font-display text-5xl font-extrabold uppercase tracking-tight', go ? 'text-white' : 'text-zinc-600')}>
          {go ? t('NOW!') : t('Wait…')}
        </span>
      </motion.div>
      <TapButton onClick={tap} disabled={locked} label={t('TACKLE!')} tone="danger" />
    </div>
  );
}

/* ───────── Dribble: arrow sequence ───────── */

type Dir = 'L' | 'U' | 'R';
const ARROWS: Record<Dir, typeof ArrowLeft> = { L: ArrowLeft, U: ArrowUp, R: ArrowRight };
const DIRS: Dir[] = ['L', 'U', 'R'];

function DribbleGame({ bonus, pressure, onStop, locked }: GameProps) {
  const t = useT();
  const STEPS = 3;
  const window = 1250 - pressure * 350 + bonus * 1500;
  const [seq] = useState<Dir[]>(() => Array.from({ length: STEPS }, () => DIRS[Math.floor(Math.random() * 3)]));
  const [step, setStep] = useState(0);
  const [hits, setHits] = useState(0);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [key, setKey] = useState(0);
  const hitsRef = useRef(0);
  const doneRef = useRef(false);

  const advance = useCallback(
    (ok: boolean) => {
      if (doneRef.current) return;
      if (ok) {
        hitsRef.current += 1;
        setHits((h) => h + 1);
      }
      setMarks((m) => [...m, ok]);
      if (step + 1 >= STEPS) {
        doneRef.current = true;
        const h = hitsRef.current;
        onStop(h >= 3 ? 'perfect' : h === 2 ? 'good' : 'miss');
      } else {
        setStep((s) => s + 1);
        setKey((k) => k + 1);
      }
    },
    [step, onStop],
  );

  // Each arrow expires on its own
  useEffect(() => {
    if (locked) return;
    const id = setTimeout(() => advance(false), window);
    return () => clearTimeout(id);
  }, [key, locked, window, advance]);

  const press = (d: Dir) => {
    if (locked) return;
    haptic(8);
    advance(d === seq[step]);
  };

  const Current = ARROWS[seq[Math.min(step, STEPS - 1)]];
  return (
    <div className="space-y-4">
      <div className="relative flex h-[190px] select-none flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <div className="flex gap-2">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-2.5 w-8 rounded-full',
                marks[i] === undefined ? (i === step ? 'bg-white/40' : 'bg-white/10') : marks[i] ? 'bg-neon-400' : 'bg-crimson-500',
              )}
            />
          ))}
        </div>
        {!locked && step < STEPS && (
          <motion.div key={key} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-gold-400 bg-gold-400/15 text-gold-300 shadow-gold">
            <Current className="h-12 w-12" strokeWidth={3} />
          </motion.div>
        )}
        {!locked && (
          <div className="absolute inset-x-6 bottom-4 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div key={key} className="h-full origin-left rounded-full bg-gold-400" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: window / 1000, ease: 'linear' }} />
          </div>
        )}
        <span className="absolute right-3 top-3 text-xs font-bold text-zinc-500">
          {hits}/{STEPS}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5" aria-label={t('Direction')}>
        {DIRS.map((d) => {
          const A = ARROWS[d];
          return (
            <button
              key={d}
              onClick={() => press(d)}
              disabled={locked}
              className="flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-zinc-100 transition-all active:scale-90 active:bg-neon-400/25 disabled:opacity-40"
            >
              <A className="h-7 w-7" strokeWidth={3} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TapButton({ onClick, label, disabled, tone = 'primary' }: { onClick: () => void; label: string; disabled?: boolean; tone?: 'primary' | 'danger' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        'flex h-16 w-full items-center justify-center gap-2 rounded-2xl font-display text-2xl font-extrabold uppercase tracking-wide shadow-lg transition-opacity disabled:opacity-40',
        tone === 'danger' ? 'bg-gradient-to-b from-crimson-400 to-crimson-600 text-white shadow-crimson' : 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon',
      )}
    >
      <Gauge className="h-5 w-5" /> {label}
    </motion.button>
  );
}
