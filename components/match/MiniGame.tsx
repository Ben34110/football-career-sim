'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Footprints, Gauge, Hand, Play, Route, Shield, Swords, Target, Timer, Users, Wind, Zap, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Card';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { HAIR_COLORS, SKINS } from '@/lib/data/look';
import { useGameStore } from '@/lib/store';
import type { MiniExtra, MiniKind, MiniQuality } from '@/lib/types';
import { BlockGame } from './minigames/BlockGame';
import { OneOnOneGame } from './minigames/OneOnOneGame';
import { RaceGame } from './minigames/RaceGame';
import { ReboundGame } from './minigames/ReboundGame';
import { SlalomGame } from './minigames/SlalomGame';
import { SlideGame } from './minigames/SlideGame';
import { VolleyGame } from './minigames/VolleyGame';
import { cn } from '@/lib/utils';

interface Props {
  kind: MiniKind;
  /** The attribute that drives this mini-game (widens the sweet spot) */
  skill: number;
  /** 0..1 — makes everything faster */
  pressure: number;
  /** 0..1 — strength of the opposition: narrower margins */
  difficulty: number;
  /** Your shirt and theirs, for the scene-based games */
  kit?: string;
  oppKit?: string;
  /** The moment happens in your own box: a foul can cost a penalty */
  inBox?: boolean;
  onDone: (q: MiniQuality, extra?: MiniExtra) => void;
}

const META: Record<MiniKind, { title: string; how: string[]; tip: string; icon: LucideIcon }> = {
  power: {
    title: 'Power Shot',
    how: ['A cursor sweeps left and right — and its speed keeps changing.', 'Tap STRIKE when it is inside the gold zone.'],
    tip: 'The gold zone is tiny. The green zone is a decent strike.',
    icon: Target,
  },
  header: {
    title: 'Aerial Duel',
    how: ['A ring closes in on the ball.', 'Tap JUMP exactly when it overlaps the gold circle.'],
    tip: 'Too early or too late and the defender wins it.',
    icon: Wind,
  },
  tackle: {
    title: 'Last-Ditch Tackle',
    how: ['Wait for the screen to flash GREEN, then tap TACKLE instantly.', 'Careful: a yellow flash is a decoy — do not move.'],
    tip: 'Tapping early is a foul. Reflexes win this one.',
    icon: Swords,
  },
  dribble: {
    title: 'Skill Run',
    how: ['Arrows appear one at a time — press the same direction before the bar runs out.', 'A RED arrow is inverted: press the opposite direction!'],
    tip: 'Hit every arrow for a perfect run.',
    icon: Hand,
  },
  sprint: {
    title: 'Sprint Back',
    how: ['Tap the button as fast as you can to fill the bar.', 'The bar drains constantly — stop and you lose ground.'],
    tip: 'Fill it with time to spare for a perfect recovery.',
    icon: Zap,
  },
  memory: {
    title: 'Pass Sequence',
    how: ['Watch which teammates light up in order.', 'Then tap them in the same order.'],
    tip: 'One slip is forgiven. Two and the move breaks down.',
    icon: Users,
  },
  aim: {
    title: 'Precision Shot',
    how: ['A crosshair drifts around the goal.', 'Tap SHOOT the moment it is over the target.'],
    tip: 'It speeds up under pressure — do not wait for the perfect line.',
    icon: Target,
  },
  slide: {
    title: 'Sliding Tackle',
    how: ['The attacker pushes the ball ahead, then reels it back in.', 'Slide while the ball is far from his feet.'],
    tip: 'Too late and you take the man: yellow card, or red if it is reckless.',
    icon: Swords,
  },
  slalom: {
    title: 'Dribble Run',
    how: ['Defenders come down the pitch.', 'Tap left or right to change lane and slip past them.'],
    tip: 'Every contact slows you down.',
    icon: Route,
  },
  race: {
    title: 'Sprint Duel',
    how: ['Tap LEFT and RIGHT in turn to run.', 'Keep the rhythm: tapping the same side twice costs you a step.'],
    tip: 'Beat the defender to the line.',
    icon: Timer,
  },
  block: {
    title: 'Block the Shot',
    how: ['Read the shooter, then pick the lane to cover.', 'You can change your mind until the ball is struck.'],
    tip: 'Watch his hips, not his eyes.',
    icon: Shield,
  },
  volley: {
    title: 'Volley',
    how: ['The ball drops from the sky.', 'Tap when it reaches the gold line.'],
    tip: 'Hit it at the top of the bounce for the sweetest strike.',
    icon: Target,
  },
  oneonone: {
    title: 'One on One',
    how: ['Wait for the keeper to commit.', 'Then beat him: left, right or chip.'],
    tip: 'Go too early and he reads you.',
    icon: Crosshair,
  },
  rebound: {
    title: 'Poacher',
    how: ['The ball ricochets around the six-yard box.', 'Tap it before the defenders clear.'],
    tip: 'Only the real ball counts.',
    icon: Zap,
  },
  charge: {
    title: 'Perfect Delivery',
    how: ['HOLD the button to charge the power.', 'RELEASE when the meter reaches the gold marker.'],
    tip: 'Hold too long and it overshoots.',
    icon: Footprints,
  },
};

/** One short line above the frozen first frame. */
const HINT: Record<MiniKind, string> = {
  power: 'Stop the cursor in the gold zone.',
  header: 'HOLD to close the ring, RELEASE to jump on the gold circle.',
  tackle: 'Press START: 3 seconds to get ready, then tap on the green flash only.',
  dribble: 'Press the arrow’s direction — red means opposite. The first arrow has no timer.',
  sprint: 'Press SPRINT to start: 3 seconds to get ready, then tap as fast as you can.',
  memory: 'Press PLAY, watch the passes, then repeat them.',
  aim: 'Tap when the crosshair is on the target.',
  charge: 'Hold, then release on the gold line.',
  slide: 'Press START, then slide when the ball is far from his feet.',
  slalom: 'Tap left or right to dodge the defenders.',
  race: 'Alternate LEFT and RIGHT as fast as you can.',
  block: 'Read the shooter and cover the right lane.',
  volley: 'Tap when the ball reaches the gold line.',
  oneonone: 'Wait for the keeper to commit, then pick your side.',
  rebound: 'Tap the real ball before it is cleared.',
};

const QUALITY_COPY: Record<MiniQuality, { text: string; color: string }> = {
  perfect: { text: 'PERFECT!', color: 'text-gold-300' },
  good: { text: 'GOOD', color: 'text-neon-300' },
  miss: { text: 'MISSED', color: 'text-crimson-400' },
};

/** Games with no time pressure — waiting never hurts — begin by themselves; the others wait for the first tap. */
const AUTO_START: MiniKind[] = ['power', 'aim', 'charge'];

export function MiniGame({ kind, skill, pressure, difficulty, kit = '#10b981', oppKit = '#ef4444', inBox = false, onDone }: Props) {
  const t = useT();
  // The first frame stays frozen until the player taps once; that first tap only starts the game.
  const [running, setRunning] = useState(!AUTO_START.includes(kind));
  const [result, setResult] = useState<MiniQuality | null>(null);
  const [extra, setExtra] = useState<MiniExtra | undefined>(undefined);
  const look = useGameStore((s) => s.player?.look);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meta = META[kind];
  const Icon = meta.icon;
  /** −0.02 … +0.08: better players get a slightly more forgiving sweet spot */
  const bonus = Math.max(-0.02, Math.min(0.08, (skill - 68) / 400));

  useEffect(() => {
    // a short beat so the screen is readable, then the self-starting games go
    const auto = AUTO_START.includes(kind) ? setTimeout(() => setRunning(true), 400) : null;
    return () => {
      if (auto) clearTimeout(auto);
    };
  }, [kind]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const finish = useCallback((q: MiniQuality, ex?: MiniExtra) => {
    if (done.current) return;
    done.current = true;
    setResult(q);
    setExtra(ex);
    haptic(ex?.card === 'red' ? [120, 60, 120] : q === 'miss' ? [90] : q === 'perfect' ? [30, 40, 60] : 25);
    timer.current = setTimeout(() => onDoneRef.current(q, ex), 1100);
  }, []);

  const game: GameProps = { bonus, pressure, difficulty, locked: !!result, running, onStop: finish };
  const scene = {
    ...game,
    kit,
    oppKit,
    inBox,
    skin: SKINS[look?.skin ?? 2] ?? SKINS[2],
    hair: (HAIR_COLORS[look?.hairColor ?? 1] ?? HAIR_COLORS[1]).hex,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-gold-300">{t('Skill moment')}</div>
          <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{t(meta.title)}</h3>
        </div>
        <Chip tone="gold">
          <Icon className="h-3 w-3" /> {skill}
        </Chip>
      </div>

      <p className="-mt-1 text-center text-[13px] font-semibold text-zinc-300">{t(HINT[kind])}</p>

      <div className="relative">
        {kind === 'power' && <PowerBar {...game} />}
        {kind === 'header' && <RingGame {...game} />}
        {kind === 'tackle' && <ReactionGame {...game} />}
        {kind === 'dribble' && <DribbleGame {...game} />}
        {kind === 'sprint' && <SprintGame {...game} />}
        {kind === 'memory' && <MemoryGame {...game} />}
        {kind === 'aim' && <AimGame {...game} />}
        {kind === 'charge' && <ChargeGame {...game} />}
        {kind === 'slide' && <SlideGame {...scene} />}
        {kind === 'slalom' && <SlalomGame {...scene} />}
        {kind === 'race' && <RaceGame {...scene} />}
        {kind === 'block' && <BlockGame {...scene} />}
        {kind === 'volley' && <VolleyGame {...scene} />}
        {kind === 'oneonone' && <OneOnOneGame {...scene} />}
        {kind === 'rebound' && <ReboundGame {...scene} />}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <span className={cn('font-display text-6xl font-extrabold italic tracking-tight drop-shadow-[0_0_18px_rgba(0,0,0,0.8)]', extra?.card ? (extra.card === 'red' ? 'text-red-500' : 'text-yellow-300') : QUALITY_COPY[result].color)}>
                {t(extra?.card ? (extra.card === 'red' ? 'RED CARD' : 'YELLOW CARD') : QUALITY_COPY[result].text)}
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
  difficulty: number;
  locked: boolean;
  /** false until the first tap: the first frame is frozen */
  running: boolean;
  onStop: (q: MiniQuality, extra?: MiniExtra) => void;
}

/* ───────── Power shot: sweet-spot bar with a restless cursor ───────── */

function PowerBar({ bonus, pressure, difficulty, onStop, locked, running }: GameProps) {
  const t = useT();
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const [center] = useState(() => 0.25 + Math.random() * 0.5);
  const perfect = (0.06 + bonus * 0.25) * (1 - 0.15 * difficulty);
  const good = (0.17 + bonus * 0.8) * (1 - 0.12 * difficulty);

  useEffect(() => {
    if (locked || !running) return;
    const base = 0.72 + pressure * 0.3 + difficulty * 0.2; // traversals per second
    let raf = 0;
    let last = performance.now();
    let phase = Math.random();
    const loop = (now: number) => {
      // speed wobbles so the rhythm can't simply be memorised
      const speed = base * (1 + 0.28 * Math.sin(now / 380));
      phase = (phase + ((now - last) / 1000) * speed) % 2;
      last = now;
      const p = phase <= 1 ? phase : 2 - phase;
      posRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locked, running, pressure, difficulty]);

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

/* ───────── Header: the ring closes while you HOLD, release to jump ───────── */

function RingGame({ bonus, pressure, difficulty, onStop, locked }: GameProps) {
  const t = useT();
  const [r, setR] = useState(1);
  const [holding, setHolding] = useState(false);
  const rRef = useRef(1);
  const holdRef = useRef(false);
  const total = 2100 - pressure * 250 - difficulty * 150; // ms of holding to close the whole ring
  const perfect = (0.065 + bonus * 0.3) * (1 - 0.2 * difficulty);
  const good = (0.18 + bonus * 0.8) * (1 - 0.15 * difficulty);

  const release = useCallback(() => {
    if (!holdRef.current || locked) return;
    holdRef.current = false;
    setHolding(false);
    const d = Math.abs(rRef.current - 0.18);
    onStop(d <= perfect ? 'perfect' : d <= good ? 'good' : 'miss');
  }, [locked, onStop, perfect, good]);

  useEffect(() => {
    if (locked) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (holdRef.current) {
        rRef.current = Math.max(0, rRef.current - dt / total);
        setR(rRef.current);
        if (rRef.current <= 0) {
          // held until the ring vanished: far too late
          holdRef.current = false;
          setHolding(false);
          onStop('miss');
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const up = () => release();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [locked, total, onStop, release]);

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
      <motion.button
        whileTap={{ scale: 0.96 }}
        onPointerDown={(e) => {
          e.preventDefault();
          if (locked || holdRef.current) return;
          holdRef.current = true;
          setHolding(true);
          haptic(10);
        }}
        disabled={locked}
        className="flex h-16 w-full touch-none select-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase tracking-wide text-zinc-950 shadow-neon disabled:opacity-40"
      >
        <Gauge className="h-5 w-5" /> {holding ? t('RELEASE TO JUMP!') : t('HOLD')}
      </motion.button>
    </div>
  );
}

/* ───────── Tackle: press to start, 3 s to get ready, then react ───────── */

function ReactionGame({ bonus, pressure, difficulty, onStop, locked }: GameProps) {
  const t = useT();
  const [phase, setPhase] = useState<'idle' | 'count' | 'wait' | 'decoy' | 'go'>('idle');
  const [count, setCount] = useState(3);
  // set once when the countdown ends; the random wait is scheduled from it exactly once
  const [waiting, setWaiting] = useState(false);
  const phaseRef = useRef<'idle' | 'count' | 'wait' | 'decoy' | 'go'>('idle');
  const goAt = useRef(0);
  const perfect = 240 + bonus * 700 - difficulty * 20;
  const good = 470 + bonus * 900 - pressure * 60 - difficulty * 40;

  const setBoth = useCallback((v: 'idle' | 'count' | 'wait' | 'decoy' | 'go') => {
    phaseRef.current = v;
    setPhase(v);
  }, []);

  // 3 … 2 … 1 …
  useEffect(() => {
    if (phase !== 'count' || locked) return;
    if (count <= 0) {
      setBoth('wait');
      setWaiting(true);
      return;
    }
    haptic(8);
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count, locked, setBoth]);

  // after the countdown: a random wait, sometimes with a yellow decoy first
  useEffect(() => {
    if (!waiting || locked) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    let wait = 900 + Math.random() * 1500;
    if (Math.random() < 0.4 + difficulty * 0.15) {
      ids.push(setTimeout(() => setBoth('decoy'), wait));
      ids.push(setTimeout(() => setBoth('wait'), wait + 380));
      wait += 380 + 700 + Math.random() * 900;
    }
    ids.push(
      setTimeout(() => {
        goAt.current = performance.now();
        setBoth('go');
      }, wait),
    );
    return () => ids.forEach(clearTimeout);
  }, [waiting, locked, difficulty, setBoth]);

  useEffect(() => {
    if (phase !== 'go' || locked) return;
    const id = setTimeout(() => onStop('miss'), good + 300);
    return () => clearTimeout(id);
  }, [phase, locked, good, onStop]);

  const tap = () => {
    if (locked) return;
    const p = phaseRef.current;
    if (p === 'idle') {
      setCount(3);
      setBoth('count');
      return;
    }
    if (p === 'count') return; // still getting ready
    if (p !== 'go') return onStop('miss'); // jumped in too early
    const ms = performance.now() - goAt.current;
    onStop(ms <= perfect ? 'perfect' : ms <= good ? 'good' : 'miss');
  };

  return (
    <div className="space-y-4">
      <motion.div
        animate={{
          backgroundColor: phase === 'go' ? 'rgba(16,185,129,0.55)' : phase === 'decoy' ? 'rgba(234,179,8,0.45)' : 'rgba(0,0,0,0.4)',
          scale: phase === 'go' ? 1.02 : 1,
        }}
        transition={{ duration: 0.08 }}
        className="flex h-[190px] select-none items-center justify-center rounded-3xl border border-white/10"
      >
        {phase === 'count' ? (
          <AnimatePresence mode="wait">
            <motion.span key={count} initial={{ scale: 1.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="font-display text-8xl font-extrabold text-gold-300">
              {count > 0 ? count : '•'}
            </motion.span>
          </AnimatePresence>
        ) : (
          <span className={cn('font-display text-5xl font-extrabold uppercase tracking-tight', phase === 'go' ? 'text-white' : phase === 'decoy' ? 'text-gold-200' : 'text-zinc-500')}>
            {phase === 'go' ? t('NOW!') : phase === 'decoy' ? t('Steady…') : phase === 'idle' ? t('Ready?') : t('Wait…')}
          </span>
        )}
      </motion.div>
      <TapButton onClick={tap} disabled={locked} label={phase === 'idle' ? t('START') : t('TACKLE!')} tone="danger" />
    </div>
  );
}

/* ───────── Dribble: arrow sequence, some inverted. No timer on the first arrow ───────── */

type Dir = 'L' | 'U' | 'R' | 'D';
const ARROWS: Record<Dir, LucideIcon> = { L: ArrowLeft, U: ArrowUp, R: ArrowRight, D: ArrowDown };
const OPPOSITE: Record<Dir, Dir> = { L: 'R', R: 'L', U: 'D', D: 'U' };
const DIRS: Dir[] = ['L', 'U', 'D', 'R'];

function DribbleGame({ bonus, pressure, difficulty, onStop, locked }: GameProps) {
  const t = useT();
  const STEPS = 5;
  const window = 1600 - pressure * 250 - difficulty * 150 + bonus * 1200;
  const [seq] = useState(() =>
    Array.from({ length: STEPS }, (_, i) => ({
      dir: DIRS[Math.floor(Math.random() * 4)],
      inverted: i >= 2 && Math.random() < 0.2,
    })),
  );
  const [step, setStep] = useState(0);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [key, setKey] = useState(0);
  // the clock only starts once the player has answered the first arrow
  const [started, setStarted] = useState(false);
  const hitsRef = useRef(0);
  const doneRef = useRef(false);

  const advance = useCallback(
    (ok: boolean) => {
      if (doneRef.current) return;
      if (ok) hitsRef.current += 1;
      setMarks((m) => [...m, ok]);
      if (step + 1 >= STEPS) {
        doneRef.current = true;
        const h = hitsRef.current;
        onStop(h >= 5 ? 'perfect' : h === 4 ? 'good' : 'miss');
      } else {
        setStep((s) => s + 1);
        setKey((k) => k + 1);
      }
    },
    [step, onStop],
  );

  useEffect(() => {
    if (locked || !started) return;
    const id = setTimeout(() => advance(false), window);
    return () => clearTimeout(id);
  }, [key, locked, started, window, advance]);

  const press = (d: Dir) => {
    if (locked) return;
    haptic(8);
    setStarted(true);
    const cur = seq[step];
    advance(d === (cur.inverted ? OPPOSITE[cur.dir] : cur.dir));
  };

  const cur = seq[Math.min(step, STEPS - 1)];
  const Current = ARROWS[cur.dir];
  return (
    <div className="space-y-4">
      <div className="relative flex h-[190px] select-none flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={cn('h-2.5 w-7 rounded-full', marks[i] === undefined ? (i === step ? 'bg-white/40' : 'bg-white/10') : marks[i] ? 'bg-neon-400' : 'bg-crimson-500')}
            />
          ))}
        </div>
        {!locked && (
          <motion.div
            key={key}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-3xl border-2',
              cur.inverted ? 'border-crimson-400 bg-crimson-500/20 text-crimson-300 shadow-crimson' : 'border-gold-400 bg-gold-400/15 text-gold-300 shadow-gold',
            )}
          >
            <Current className="h-12 w-12" strokeWidth={3} />
          </motion.div>
        )}
        {!locked && cur.inverted && <span className="text-[11px] font-bold uppercase tracking-widest text-crimson-400">{t('Inverted!')}</span>}
        {!locked && started && (
          <div className="absolute inset-x-6 bottom-4 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div key={key} className="h-full origin-left rounded-full bg-gold-400" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: window / 1000, ease: 'linear' }} />
          </div>
        )}
        {!locked && !started && <span className="absolute inset-x-0 bottom-4 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{t('No timer on the first arrow')}</span>}
      </div>
      <div className="grid grid-cols-4 gap-2" aria-label={t('Direction')}>
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

/* ───────── Sprint: press to start, a 3 s countdown, then mash ───────── */

function SprintGame({ bonus, pressure, difficulty, onStop, locked }: GameProps) {
  const t = useT();
  const TOTAL = 3300 - pressure * 300;
  const tapValue = 8.2 - difficulty * 1.2 + bonus * 10;
  const drain = 13 + difficulty * 4 + pressure * 3; // per second
  const [phase, setPhase] = useState<'idle' | 'count' | 'run'>('idle');
  const [count, setCount] = useState(3);
  const [fill, setFill] = useState(0);
  const [left, setLeft] = useState(TOTAL);
  const fillRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (phase !== 'count' || locked) return;
    if (count <= 0) {
      setPhase('run');
      return;
    }
    haptic(8);
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count, locked]);

  useEffect(() => {
    if (phase !== 'run' || locked) return;
    let raf = 0;
    let last = performance.now();
    const start = last;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      fillRef.current = Math.max(0, fillRef.current - drain * dt);
      setFill(fillRef.current);
      const remaining = TOTAL - (now - start);
      setLeft(Math.max(0, remaining));
      if (!doneRef.current && fillRef.current >= 100) {
        doneRef.current = true;
        onStop(remaining > 700 ? 'perfect' : 'good');
        return;
      }
      if (remaining <= 0) {
        doneRef.current = true;
        onStop(fillRef.current >= 66 ? 'good' : 'miss');
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, locked, TOTAL, drain, onStop]);

  const tap = () => {
    if (locked || doneRef.current) return;
    if (phase === 'idle') {
      setCount(3);
      setPhase('count');
      return;
    }
    if (phase !== 'run') return; // still getting ready
    haptic(5);
    fillRef.current = Math.min(100, fillRef.current + tapValue);
  };

  return (
    <div className="space-y-4">
      <div className="select-none space-y-4 rounded-3xl border border-white/10 bg-black/40 p-5">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>{t('Speed')}</span>
          <span className="font-num text-sm text-zinc-200">{phase === 'run' ? `${(left / 1000).toFixed(1)}s` : `${(TOTAL / 1000).toFixed(1)}s`}</span>
        </div>
        <div className="h-6 overflow-hidden rounded-full bg-white/[0.08]">
          <div className={cn('h-full rounded-full', fill > 66 ? 'bg-gold-400' : 'bg-neon-400')} style={{ width: `${fill}%` }} />
        </div>
        <div className="flex h-12 items-center justify-center">
          {phase === 'count' ? (
            <AnimatePresence mode="wait">
              <motion.span key={count} initial={{ scale: 1.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="font-display text-5xl font-extrabold text-gold-300">
                {count > 0 ? count : t('GO!')}
              </motion.span>
            </AnimatePresence>
          ) : (
            <span className="text-xs font-semibold text-zinc-500">{phase === 'idle' ? t('Press SPRINT to start: you get 3 seconds to get ready.') : t('Tap, tap, tap!')}</span>
          )}
        </div>
      </div>
      <TapButton onClick={tap} disabled={locked} label={t('SPRINT!')} />
    </div>
  );
}

/* ───────── Memory: press PLAY to see the passes, then repeat them ───────── */

function MemoryGame({ pressure, difficulty, onStop, locked }: GameProps) {
  const t = useT();
  const N = 3 + (difficulty > 0.7 ? 1 : 0) + (pressure > 0.75 ? 1 : 0);
  const [seq] = useState(() => {
    const out: number[] = [];
    while (out.length < N) {
      const c = Math.floor(Math.random() * 9);
      if (out[out.length - 1] !== c) out.push(c);
    }
    return out;
  });
  const [phase, setPhase] = useState<'idle' | 'watch' | 'repeat'>('idle');
  const [lit, setLit] = useState<number | null>(null);
  const [input, setInput] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<{ cell: number; ok: boolean } | null>(null);

  useEffect(() => {
    if (phase !== 'watch' || locked) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const gap = 780 - difficulty * 120;
    seq.forEach((c, i) => {
      ids.push(setTimeout(() => setLit(c), 400 + i * gap));
      ids.push(setTimeout(() => setLit(null), 400 + i * gap + gap * 0.62));
    });
    ids.push(setTimeout(() => setPhase('repeat'), 400 + seq.length * gap + 150));
    return () => ids.forEach(clearTimeout);
  }, [phase, seq, locked, difficulty]);

  const tap = (cell: number) => {
    if (locked || phase !== 'repeat') return;
    haptic(8);
    const ok = cell === seq[input];
    setFlash({ cell, ok });
    window.setTimeout(() => setFlash(null), 220);
    const m = mistakes + (ok ? 0 : 1);
    if (!ok) setMistakes(m);
    if (m >= 2) return onStop('miss');
    if (input + 1 >= seq.length) return onStop(m === 0 ? 'perfect' : 'good');
    setInput(input + 1);
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-400">
        {phase === 'idle' ? t('Ready?') : phase === 'watch' ? t('Watch the passes…') : t('Your turn!')}
      </p>
      <div className="grid select-none grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-emerald-950/40 p-3">
        {Array.from({ length: 9 }, (_, i) => {
          const on = lit === i;
          const f = flash?.cell === i ? flash.ok : null;
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={locked || phase !== 'repeat'}
              aria-label={`${t('Teammate')} ${i + 1}`}
              className={cn(
                'flex h-[72px] items-center justify-center rounded-2xl border text-2xl transition-all active:scale-95',
                on ? 'border-gold-300 bg-gold-400/40 shadow-gold' : f === true ? 'border-neon-300 bg-neon-400/30' : f === false ? 'border-crimson-400 bg-crimson-500/30' : 'border-white/10 bg-white/[0.05]',
              )}
            >
              👕
            </button>
          );
        })}
      </div>
      {phase === 'idle' ? (
        <Button block size="lg" onClick={() => setPhase('watch')}>
          <Play className="h-5 w-5 fill-current" /> {t('PLAY')}
        </Button>
      ) : (
        <div className="flex justify-center gap-1.5">
          {seq.map((_, i) => (
            <span key={i} className={cn('h-2 w-6 rounded-full', i < input ? 'bg-neon-400' : 'bg-white/10')} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Aim: a drifting crosshair ───────── */

function AimGame({ bonus, pressure, difficulty, onStop, locked, running }: GameProps) {
  const t = useT();
  const [target] = useState(() => ({ x: 0.22 + Math.random() * 0.56, y: 0.25 + Math.random() * 0.5 }));
  const [cross, setCross] = useState({ x: 0.5, y: 0.5 });
  const ref = useRef({ x: 0.5, y: 0.5 });
  // a big target: the crosshair crosses it often and the gold centre is easy to read
  const perfect = (0.09 + bonus * 0.2) * (1 - 0.2 * difficulty);
  const good = (0.2 + bonus * 0.5) * (1 - 0.15 * difficulty);

  useEffect(() => {
    if (locked || !running) return;
    const speed = 0.9 + pressure * 0.4 + difficulty * 0.3;
    const [fa, fb, pa, pb] = [1.1 + Math.random() * 0.4, 1.5 + Math.random() * 0.5, Math.random() * 6, Math.random() * 6];
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const tt = ((now - start) / 1000) * speed;
      const p = { x: 0.5 + 0.44 * Math.sin(tt * fa + pa), y: 0.5 + 0.4 * Math.sin(tt * fb + pb) };
      ref.current = p;
      setCross(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [locked, running, pressure, difficulty]);

  const shoot = () => {
    if (locked) return;
    // distance measured in the (wider) horizontal unit so the hitbox feels round
    const d = Math.hypot((ref.current.x - target.x) * 1.6, ref.current.y - target.y);
    onStop(d <= perfect ? 'perfect' : d <= good ? 'good' : 'miss');
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[16/10] select-none overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(16,224,138,0.18),#050a08_80%)]">
        <div className="goal-net absolute inset-[8%] rounded-t-md border-x-[5px] border-t-[5px] border-zinc-100/80" />
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neon-400/70 bg-neon-400/10"
          style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%`, width: `${(good * 2 * 100) / 1.6}%`, aspectRatio: '1 / 1' }}
        >
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-400 bg-gold-400/30 shadow-[0_0_14px_rgba(242,193,78,0.7)]"
            style={{ width: `${(perfect / good) * 100}%`, aspectRatio: '1 / 1' }}
          />
        </div>
        <div className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2" style={{ left: `${cross.x * 100}%`, top: `${cross.y * 100}%` }}>
          <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/90" />
          <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-white/90" />
          <span className="absolute inset-1 rounded-full border border-white/80" />
        </div>
      </div>
      <TapButton onClick={shoot} disabled={locked} label={t('SHOOT!')} />
    </div>
  );
}

/* ───────── Charge: hold, then release on the marker ───────── */

function ChargeGame({ bonus, pressure, difficulty, onStop, locked, running }: GameProps) {
  const t = useT();
  const [target] = useState(() => 0.55 + Math.random() * 0.33);
  const [level, setLevel] = useState(0);
  const [holding, setHolding] = useState(false);
  const levelRef = useRef(0);
  const holdRef = useRef(false);
  const perfect = (0.05 + bonus * 0.25) * (1 - 0.15 * difficulty);
  const good = (0.125 + bonus * 0.7) * (1 - 0.12 * difficulty);
  const fillMs = 1650 - pressure * 250 - difficulty * 200;

  const release = useCallback(() => {
    if (!holdRef.current || locked) return;
    holdRef.current = false;
    setHolding(false);
    const d = Math.abs(levelRef.current - target);
    onStop(d <= perfect ? 'perfect' : d <= good ? 'good' : 'miss');
  }, [locked, onStop, target, perfect, good]);

  useEffect(() => {
    if (locked || !running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (holdRef.current) {
        levelRef.current = Math.min(1, levelRef.current + dt / fillMs);
        setLevel(levelRef.current);
        if (levelRef.current >= 1) {
          // overshoot: held too long
          holdRef.current = false;
          setHolding(false);
          onStop('miss');
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const up = () => release();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [locked, running, fillMs, onStop, release]);

  return (
    <div className="space-y-4">
      <div className="select-none rounded-3xl border border-white/10 bg-black/40 p-5">
        <div className="relative mx-auto h-44 w-12 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-neon-600 to-neon-300" style={{ height: `${level * 100}%` }} />
          <div className="absolute inset-x-0 h-[3px] bg-gold-400 shadow-[0_0_8px_rgba(242,193,78,0.9)]" style={{ bottom: `${target * 100}%` }} />
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-zinc-500">{holding ? t('Release at the gold line!') : t('Hold the button to charge')}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onPointerDown={(e) => {
          e.preventDefault();
          if (locked || holdRef.current) return;
          holdRef.current = true;
          setHolding(true);
          haptic(10);
        }}
        disabled={locked}
        className="flex h-16 w-full touch-none select-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase tracking-wide text-zinc-950 shadow-neon disabled:opacity-40"
      >
        <Gauge className="h-5 w-5" /> {holding ? t('RELEASE!') : t('HOLD')}
      </motion.button>
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
        'flex h-16 w-full touch-none select-none items-center justify-center gap-2 rounded-2xl font-display text-2xl font-extrabold uppercase tracking-wide shadow-lg transition-opacity disabled:opacity-40',
        tone === 'danger' ? 'bg-gradient-to-b from-crimson-400 to-crimson-600 text-white shadow-crimson' : 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon',
      )}
    >
      <Gauge className="h-5 w-5" /> {label}
    </motion.button>
  );
}
