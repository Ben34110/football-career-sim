'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Route } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { WAVES, caught, dribbleQuality, glide, makeDribble, planEnd, waveArrive, type Lane } from '@/lib/engine/minigames/dribble';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { BackPlayer, FrontPlayer } from './figures';
import { ActionButton, CountOverlay, useClock, useStartFlow, type SceneProps } from './shared';

const W = 340;
const H = 220;
const CX = 170;
const HOR = 62;
/** Where your feet are on the screen */
const YP = 198;

const SKINS = ['#c68642', '#8d5524', '#e0ac69', '#f1c27d'];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** You run up the pitch at V metres a second; everything else stands in the world, and gets closer. */
const V = 9;
const K = 8;
/** Distance ahead of you (metres) → depth on the screen (0 far … 1 at your feet, more once passed) */
const zOf = (d: number) => 1 / (1 + d / K);

/** Depth 0 (the far end) … 1 (your line) → screen row, size, and the width of a lane */
const rowAt = (z: number) => HOR + (YP - HOR) * Math.pow(Math.max(0, z), 1.7);
const sizeAt = (z: number) => 0.2 + 1.25 * Math.pow(Math.max(0, z), 1.2);
const laneW = (z: number) => 24 + 68 * z;
const xAt = (lane: number, z: number) => CX + lane * laneW(z);

/* ───────────────────────── the pitch, running at goal ───────────────────────── */

function Pitch({ scroll, zg, speed, keeperLean, keeperKit }: { scroll: number; zg: number; speed: number; keeperLean: number; keeperKit: string }) {
  // the mown stripes are fixed in the world: they come towards you as you run
  const L = 7;
  const N = 16;
  const m = scroll % L;
  const idx0 = Math.floor(scroll / L);
  const bands = Array.from({ length: N + 1 }, (_, n) => zOf(n * L - m));
  const gy = rowAt(zg);
  const gw = 1.25 * laneW(zg);
  const gh = Math.max(6, 0.62 * laneW(zg));
  return (
    <g>
      <defs>
        <linearGradient id="dr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050b1d" />
          <stop offset="1" stopColor="#173a6b" />
        </linearGradient>
        <linearGradient id="dr-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14562f" />
          <stop offset="1" stopColor="#0c3d22" />
        </linearGradient>
        <pattern id="dr-net" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0L4 4M4 0L0 4" stroke="#fff" strokeWidth=".4" opacity=".5" />
        </pattern>
      </defs>
      <rect width={W} height={HOR + 2} fill="url(#dr-sky)" />
      <g opacity=".55">
        {Array.from({ length: 38 }, (_, i) => (
          <circle key={i} cx={i * 9.2 + 3} cy={46 - ((i * 7) % 11)} r={3.6} fill={['#b45309', '#e5e7eb', '#1d4ed8', '#fbbf24', '#9ca3af'][i % 5]} opacity=".55" />
        ))}
      </g>
      <rect y={HOR - 6} width={W} height="7" fill="#0b1220" />
      <rect y={HOR - 4} width={W} height="2" fill="#10e08a" opacity=".5" />
      <rect y={HOR + 1} width={W} height={H - HOR} fill="url(#dr-grass)" />
      {/* the mown stripes run towards you */}
      {bands.slice(0, -1).map((zNear, n) => ((n + idx0) % 2 === 0 ? <rect key={n} y={rowAt(bands[n + 1])} width={W} height={Math.max(0, rowAt(zNear) - rowAt(bands[n + 1]))} fill="#fff" opacity=".04" /> : null))}
      {/* touchlines */}
      {[-1, 1].map((sd) => (
        <path key={sd} d={`M${xAt(sd * 2.05, 0)} ${rowAt(0)}L${xAt(sd * 2.05, 1.2)} ${rowAt(1.2)}`} stroke="#fff" strokeWidth="1.6" opacity=".35" fill="none" />
      ))}
      {/* the goal ahead, getting closer */}
      <g>
        <path d={`M${CX - gw} ${gy}V${gy - gh}H${CX + gw}V${gy}`} fill="url(#dr-net)" opacity=".7" />
        <path d={`M${CX - gw} ${gy}V${gy - gh}H${CX + gw}V${gy}`} stroke="#fff" strokeWidth={Math.max(1, gw * 0.05)} fill="none" strokeLinejoin="round" />
        <rect x={CX - gw} y={gy - gh} width={2 * gw} height={gh} fill="#000" opacity=".25" />
        <FrontPlayer x={CX + keeperLean * gw * 0.35} y={gy} s={sizeAt(zg) * 0.82} kit={keeperKit} skin="#e0b896" hair="#27272a" lean={keeperLean * 0.6} kick={0} arms="balance" stride={undefined} />
      </g>
      {/* speed streaks */}
      <g stroke="#fff" strokeLinecap="round" opacity={0.1 + speed * 0.12}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI - Math.PI;
          const ph = (scroll * 1.8 + i * 0.37) % 1;
          const r0 = 30 + ph * 150;
          const r1 = r0 + 14 + ph * 24;
          return <line key={i} x1={CX + Math.cos(a) * r0 * 1.6} y1={HOR + 30 - Math.sin(a) * r0 * 0.7} x2={CX + Math.cos(a) * r1 * 1.6} y2={HOR + 30 - Math.sin(a) * r1 * 0.7} strokeWidth={0.8 + ph * 1.2} opacity={Math.sin(ph * Math.PI)} />;
        }).filter(Boolean)}
      </g>
    </g>
  );
}

/* ───────────────────────── the game ───────────────────────── */

/**
 * Take on the last man. You run at goal with the ball; waves of defenders come out to meet you, each leaving a gap.
 * Slide to the lane with the gap before they reach you — every defender you run into costs you a touch.
 */
export function SlalomGame({ bonus, pressure, difficulty, locked, kit, oppKit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const plan = useMemo(() => makeDribble(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock } = useClock(playing);

  const target = useRef<Lane>(0);
  const pos = useRef(0);
  const vel = useRef(0);
  const lastClock = useRef(0);
  const scroll = useRef(0);
  const [outcome, setOutcome] = useState<boolean[]>([]); // true = he ran into a defender
  const outRef = useRef<boolean[]>([]);
  const hitAt = useRef<number[]>([]);
  const done = useRef(false);

  // physics, once per frame: you glide to your lane, the grass runs under you
  if (playing) {
    const dt = Math.min(0.05, Math.max(0, clock - lastClock.current));
    if (dt > 0) {
      const next = glide(pos.current, target.current, dt);
      vel.current = (next - pos.current) / dt;
      pos.current = next;
      scroll.current += dt * V;
      lastClock.current = clock;
    }
  }

  // one tap = one lane: from the right edge it takes two taps on LEFT to reach the left edge
  const step = (d: -1 | 1) => {
    if (locked || flow.stage !== 'play' || done.current) return;
    const next = Math.max(-1, Math.min(1, target.current + d)) as Lane;
    if (next === target.current) return;
    haptic(6);
    target.current = next;
  };

  // the moment a wave reaches you, it either lets you through or it does not
  useEffect(() => {
    if (!playing || done.current) return;
    for (let i = 0; i < WAVES; i++) {
      if (clock >= waveArrive(plan, i) && outRef.current[i] === undefined) {
        const hit = caught(plan.waves[i], pos.current, plan.reach);
        outRef.current = [...outRef.current];
        outRef.current[i] = hit;
        if (hit) hitAt.current = [...hitAt.current, clock];
        setOutcome(outRef.current);
        haptic(hit ? 90 : 8);
      }
    }
    if (clock >= planEnd(plan)) {
      done.current = true;
      onStop(dribbleQuality(outRef.current.filter(Boolean).length));
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── the picture ───── */
  // the goal stands at the far end of the pitch; you run towards it
  const goalAt = V * planEnd(plan) + 42;
  const zg = zOf(goalAt - (playing ? scroll.current : 0));
  const hits = outcome.filter(Boolean).length;
  const sinceHit = hitAt.current.length && playing ? clock - hitAt.current[hitAt.current.length - 1] : 99;
  const hitPulse = Math.exp(-sinceHit * 4);
  const wobble = Math.sin(sinceHit * 38) * 11 * hitPulse;
  const stride = (playing ? clock : 0) * 13;
  const youX = CX + pos.current * laneW(1);
  const tilt = -vel.current * 2.4 + wobble;
  // the ball stays at his feet, a touch ahead: it hops a little with each stride
  const ballHop = Math.abs(Math.sin(stride * 0.5)) * 4;
  const ballX = youX + Math.sin(stride * 0.5) * 10 + hitPulse * 12;
  const ballY = YP - 1 - ballHop - hitPulse * 12;
  const keeperLean = Math.max(-1, Math.min(1, pos.current * 0.9));

  // defenders, far ones first; the ones already past you are drawn over you
  const defenders = useMemo(
    () =>
      plan.waves.flatMap((w, i) =>
        w.blocked.map((l) => ({ i, l, skin: SKINS[(i * 3 + l + 4) % SKINS.length], seed: i * 1.7 + l * 0.9 })),
      ),
    [plan],
  );
  // the defenders are only made out when you are close enough: they come out of the dark just before the contact
  const reveal = V * plan.travel * 0.85 + 1;
  const tw = playing ? clock : 0;
  const drawn = (playing ? defenders : [])
    .map((d) => ({ ...d, dist: V * (waveArrive(plan, d.i) - tw) }))
    .map((d) => ({ ...d, alpha: clamp01((reveal - d.dist) / 2.2) }))
    .filter((d) => d.dist > -1.6 && d.alpha > 0.01)
    .sort((a, b) => b.dist - a.dist);
  const behind = drawn.filter((d) => d.dist > 0);
  const past = drawn.filter((d) => d.dist <= 0);

  const drawDefender = (d: (typeof drawn)[number]) => {
    const z = Math.min(1.25, zOf(d.dist));
    const track = Math.max(-1, Math.min(1, pos.current - d.l));
    const hit = outRef.current[d.i] && d.dist <= 0 && caught(plan.waves[d.i], pos.current, plan.reach) ? 1 : 0;
    // he holds his ground and shuffles across to you; a defender who got you throws himself in
    const lunge = hit ? clamp01(-d.dist * 0.7) : 0;
    const x = xAt(d.l, z) + track * 9 * z + (hit ? -track * 10 * lunge : 0);
    return (
      <g key={`${d.i}-${d.l}`} opacity={d.alpha}>
        <FrontPlayer x={x} y={rowAt(z)} s={sizeAt(z) * (1 + 0.08 * lunge)} kit={oppKit} skin={d.skin} hair="#18120c" lean={track * 0.7} kick={0} arms="balance" stride={d.seed + clock * 3.2} />
      </g>
    );
  };

  const done6 = outcome.length >= WAVES;
  const verdict =
    hits === 0
      ? { big: t('CLEAN RUN!'), sub: t('Not a single touch — you are through on goal.'), tone: 'text-neon-300' }
      : hits === 1
        ? { big: t('THROUGH!'), sub: t('One challenge cost you a stride.'), tone: 'text-gold-300' }
        : { big: t('DISPOSSESSED'), sub: t('Too many challenges — they won the ball.'), tone: 'text-crimson-300' };
  const showVerdict = playing && done6 && clock > waveArrive(plan, WAVES - 1) + 0.12;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{t('Contacts')} {hits}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: WAVES }, (_, i) => (
            <span key={i} className={cn('h-2.5 w-5 rounded-full transition-colors', outcome[i] === undefined ? 'bg-white/15' : outcome[i] ? 'bg-crimson-500' : 'bg-neon-400')} />
          ))}
        </div>
      </div>

      <div className="relative select-none overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ transform: hitPulse > 0.05 ? `translate(${Math.sin(sinceHit * 70) * 3 * hitPulse}px, ${Math.cos(sinceHit * 60) * 2 * hitPulse}px)` : undefined }}>
          <Pitch scroll={scroll.current} zg={zg} speed={playing ? 1 : 0} keeperLean={keeperLean} keeperKit="#f59e0b" />
          {behind.map(drawDefender)}
          {/* you, from behind, with the ball at your feet */}
          <BackPlayer x={youX} y={YP + 8} s={1.4} kit={kit} skin={skin} hair={hair} step={stride} tilt={tilt} stretch={0} dir={1} run={playing ? 2.4 : 0.6} />
          <g transform={`translate(${ballX} ${ballY})`}>
            <ellipse cx="0" cy="8" rx="6" ry="1.8" fill="#000" opacity=".3" />
            <circle r="6.2" fill="#fafafa" stroke="#18181b" strokeWidth=".7" />
            <polygon points="0,-3 3,-1 1.8,2.4 -1.8,2.4 -3,-1" fill="#18181b" />
          </g>
          {past.map(drawDefender)}
        </svg>

        {playing && (
          <div className="absolute inset-0 grid grid-cols-2">
            {([-1, 1] as const).map((d) => (
              <button key={d} aria-label={d < 0 ? t('LEFT') : t('RIGHT')} onPointerDown={(e) => { e.preventDefault(); step(d); }} className="touch-none" />
            ))}
          </div>
        )}
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 px-4 text-center text-[11px] font-semibold text-white/80">{t('Slip through the gap between the defenders.')}</div>}
        {hitPulse > 0.05 && <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(220,38,38,${0.5 * hitPulse}) 100%)` }} />}

        <AnimatePresence>
          {showVerdict && (
            <motion.div initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <div className={cn('font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]', verdict.tone)}>{verdict.big}</div>
              <div className="text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{verdict.sub}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {flow.stage === 'idle' ? (
        <ActionButton onPress={flow.start} label={t('START')} icon={<Route className="h-5 w-5" />} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              onPointerDown={(e) => {
                e.preventDefault();
                step(d);
              }}
              disabled={flow.stage !== 'play' || locked}
              className="flex h-20 touch-none select-none flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-xs font-extrabold uppercase tracking-wide text-zinc-950 shadow-neon transition active:scale-95 disabled:opacity-40"
            >
              {d < 0 ? <ChevronLeft className="h-9 w-9" /> : <ChevronRight className="h-9 w-9" />}
              {d < 0 ? t('LEFT') : t('RIGHT')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
