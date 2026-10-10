'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DASH, PRE, ROUNDS, ballAt, judgeDash, makeRebound, shotAt, strikeAt, tClear, type Lane, type ReboundVerdict } from '@/lib/engine/minigames/rebound';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { BackPlayer, FrontPlayer } from './figures';
import { CountOverlay, useClock, useStartFlow, type SceneProps } from './shared';

const W = 340;
const H = 220;
const CX = 170;
const HOR = 62;
const YP = 198;
/** Where the goal line is, and the depth range between it and your feet */
const ZG = 0.5;
const ZF = 0.97;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

const rowAt = (z: number) => HOR + (YP - HOR) * Math.pow(Math.max(0, z), 1.7);
const sizeAt = (z: number) => 0.2 + 1.25 * Math.pow(Math.max(0, z), 1.2);
const laneW = (z: number) => 24 + 68 * z;
/** Depth in the box (0 goal line … 1 at your feet) → depth on the screen */
const zOf = (d: number) => ZG + (ZF - ZG) * d;
/** A point of the box: lane, depth and height in metres → screen */
const project = (x: number, d: number, h: number) => {
  const z = zOf(d);
  return { x: CX + x * laneW(z), y: rowAt(z) - h * sizeAt(z) * 21, z };
};

const SKINS = ['#c68642', '#8d5524', '#e0ac69', '#f1c27d'];

/* ───────────────────────── the six-yard box, from behind you ───────────────────────── */

function Box({ keeper, keeperKit, ripple }: { keeper: { side: number; dive: number }; keeperKit: string; ripple: { x: number; y: number; p: number } | null }) {
  const gy = rowAt(ZG);
  const lw = laneW(ZG);
  const gw = 1.1 * lw;
  const gh = 0.64 * lw;
  const front = rowAt(zOf(0.9));
  return (
    <g>
      <defs>
        <linearGradient id="rb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050b1d" />
          <stop offset="1" stopColor="#173a6b" />
        </linearGradient>
        <linearGradient id="rb-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14562f" />
          <stop offset="1" stopColor="#0c3d22" />
        </linearGradient>
        <pattern id="rb-net" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0L4 4M4 0L0 4" stroke="#fff" strokeWidth=".4" opacity=".5" />
        </pattern>
      </defs>
      <rect width={W} height={HOR + 2} fill="url(#rb-sky)" />
      <g opacity=".55">
        {Array.from({ length: 38 }, (_, i) => (
          <circle key={i} cx={i * 9.2 + 3} cy={46 - ((i * 7) % 11)} r={3.6} fill={['#b45309', '#e5e7eb', '#1d4ed8', '#fbbf24', '#9ca3af'][i % 5]} opacity=".55" />
        ))}
      </g>
      <rect y={HOR - 6} width={W} height="7" fill="#0b1220" />
      <rect y={HOR - 4} width={W} height="2" fill="#10e08a" opacity=".5" />
      <rect y={HOR + 1} width={W} height={H - HOR} fill="url(#rb-grass)" />
      {Array.from({ length: 8 }, (_, k) => {
        const z0 = k / 8;
        const z1 = (k + 1) / 8;
        return k % 2 === 0 ? <rect key={k} y={rowAt(z0)} width={W} height={rowAt(z1) - rowAt(z0)} fill="#fff" opacity=".04" /> : null;
      })}
      {/* the six-yard box and the goal line */}
      <path d={`M${CX - 2.3 * laneW(ZG)} ${gy}L${CX - 2.3 * laneW(zOf(0.9))} ${front}L${CX + 2.3 * laneW(zOf(0.9))} ${front}L${CX + 2.3 * laneW(ZG)} ${gy}Z`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" opacity=".5" />
      <path d={`M${CX - 3.2 * lw} ${gy}H${CX + 3.2 * lw}`} stroke="#fff" strokeWidth="1.4" opacity=".55" />
      {/* the goal */}
      <rect x={CX - gw} y={gy - gh} width={2 * gw} height={gh} fill="url(#rb-net)" opacity=".7" />
      <rect x={CX - gw} y={gy - gh} width={2 * gw} height={gh} fill="#000" opacity=".25" />
      {ripple && ripple.p > 0 && <circle cx={ripple.x} cy={ripple.y} r={4 + ripple.p * 26} fill="#fff" opacity={0.55 * (1 - ripple.p)} />}
      <g transform={`rotate(${(keeper.side * keeper.dive * 58).toFixed(1)} ${CX + keeper.side * keeper.dive * gw * 0.35} ${gy - 14})`}>
        <FrontPlayer x={CX + keeper.side * keeper.dive * gw * 0.35} y={gy - 1} s={0.66} kit={keeperKit} skin="#e0b896" hair="#27272a" lean={0} kick={0} arms={keeper.dive > 0.3 ? 'up' : 'balance'} />
      </g>
      <path d={`M${CX - gw} ${gy}V${gy - gh}H${CX + gw}V${gy}`} stroke="#fff" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
    </g>
  );
}

/* ───────────────────────── the game ───────────────────────── */

/**
 * Poacher. A shot is saved and the ball ricochets around the six-yard box.
 * Read where it will pop out, slide to that lane, and pounce before a defender clears it.
 */
export function ReboundGame({ bonus, pressure, difficulty, locked, kit, oppKit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const plan = useMemo(() => makeRebound(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref } = useClock(playing);

  const taps = useRef<({ lane: Lane; t: number } | undefined)[]>([]);
  const verdicts = useRef<(ReboundVerdict | undefined)[]>([]);
  const pounces = useRef<(number | undefined)[]>([]);
  const [shown, setShown] = useState<(ReboundVerdict | undefined)[]>([]);
  const [picked, setPicked] = useState<Lane | null>(null);
  const done = useRef(false);

  const roundStart = (i: number) => plan.lead + i * plan.roundLen;
  // a round starts PRE seconds before its save, when the shot comes in
  const roundOf = (c: number) => Math.min(ROUNDS - 1, Math.max(0, Math.floor((c - plan.lead + PRE) / plan.roundLen)));
  const round = roundOf(clock);
  const rd = plan.rounds[round];
  const local = playing ? clock - roundStart(round) : -1;

  const record = (i: number, v: ReboundVerdict) => {
    verdicts.current = [...verdicts.current];
    verdicts.current[i] = v;
    setShown(verdicts.current);
    haptic(v === 'perfect' || v === 'good' ? [15, 20, 40] : 70);
  };

  // one tap: the lane where you think it will drop
  const choose = (lane: Lane) => {
    if (locked || !playing || done.current) return;
    const i = roundOf(ref.current);
    const lt = ref.current - roundStart(i);
    if (lt < 0 || verdicts.current[i] !== undefined) return;
    const v = judgeDash(plan.rounds[i], lane, lt);
    taps.current[i] = { lane, t: lt };
    if (v === 'perfect' || v === 'good') pounces.current[i] = strikeAt(plan.rounds[i], lt);
    setPicked(lane);
    record(i, v);
  };

  // a loose ball nobody pounced on gets cleared
  useEffect(() => {
    if (!playing || done.current) return;
    for (let i = 0; i < ROUNDS; i++) {
      if (verdicts.current[i] === undefined && clock - roundStart(i) > tClear(plan.rounds[i])) record(i, 'late');
    }
    const end = roundStart(ROUNDS - 1) + tClear(plan.rounds[ROUNDS - 1]) + 1.0;
    if (clock >= end && verdicts.current.length >= ROUNDS) {
      done.current = true;
      const n = verdicts.current.filter((v) => v === 'perfect' || v === 'good').length;
      onStop(n >= ROUNDS ? 'perfect' : n === ROUNDS - 1 ? 'good' : 'miss');
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── the picture ───── */
  const v = shown[round];
  const tp = pounces.current[round];
  const scored = v === 'perfect' || v === 'good';
  const natural = ballAt(rd, local);
  const shot = scored && tp !== undefined ? shotAt(rd, tp, local) : null;
  const pose = shot ?? natural;
  const ball = project(pose.x, pose.d, pose.h);
  const sinceStrike = tp !== undefined ? local - tp : -1;
  const goalIn = scored && sinceStrike > 0.5;
  const goalTarget = project(-rd.keeperSide * 0.72, 0, 0.9);

  // the keeper has just made the save, then dives again too late
  const keeperDive = !playing ? 0 : local < 0 ? smooth((local + PRE) / PRE) * 0.25 : scored && sinceStrike > 0.15 ? smooth((sinceStrike - 0.15) / 0.35) : Math.sin(Math.PI * clamp01(local / 0.95));
  const keeperSide = rd.keeperSide;

  // the camera pushes in on the strike and shakes with it
  const bump = scored && sinceStrike > -0.1 ? Math.sin(Math.PI * clamp01((sinceStrike + 0.1) / 1.0)) : 0;
  const zoom = 1 + 0.13 * bump;
  const zcx = CX;
  const zcy = rowAt(ZG) + 18;
  const shake = scored && sinceStrike > 0.45 && sinceStrike < 0.8 ? Math.sin(sinceStrike * 140) * 3 * (0.8 - sinceStrike) * 3 : 0;
  // the ball's last few positions, for a trail
  const trail = playing && local > -PRE
    ? [1, 2, 3, 4].map((k) => {
        const tt = local - 0.035 * k;
        const q = shot && tp !== undefined && tt >= tp ? shotAt(rd, tp, tt) : ballAt(rd, tt);
        return project(q.x, q.d, q.h);
      })
    : [];
  // the save: a burst of light where the keeper gets his hands to it
  const parry = playing && local > 0 && local < 0.3 ? local / 0.3 : -1;
  const parryAt = project(0, 0.03, 0.9);
  // tension: the closer the defender, the redder the edges
  const tension = playing && v === undefined && local > rd.t2 ? clamp01((local - rd.t2) / rd.win) : 0;
  const celebrating = scored && sinceStrike > 0.55;

  // the defender who comes to clear
  const tc = tClear(rd);
  const clearStart = tc - 0.75;
  const cl = clamp01((local - clearStart) / 0.75);
  const clearFrom = { x: -rd.lane * 1.1 + (rd.lane === 0 ? 1.2 : 0), d: 0.5 };
  const clearer = { x: lerp(clearFrom.x, rd.lane + (rd.lane >= 0 ? -0.28 : 0.28), smooth(cl)), d: lerp(clearFrom.d, 0.78, smooth(cl)) };
  const clearerHidden = scored && sinceStrike > 0.1;
  const clearKick = local > tc - 0.28 ? (local < tc ? -smooth((local - (tc - 0.28)) / 0.28) : 1 - smooth((local - tc) / 0.3) * 0.2) : 0;
  const cP = project(clearer.x, clearer.d, 0);

  // you: he waits in the middle, then sprints to the lane you tapped
  const tap = taps.current[round];
  const dash = tap ? clamp01((local - tap.t) / DASH) : 0;
  const youLane = tap ? tap.lane * (1 - Math.pow(1 - dash, 3)) : 0;
  const youX = CX + youLane * laneW(1);
  const sprinting = !!tap && dash > 0 && dash < 1;
  const lunge = tp !== undefined ? clamp01((local - tp) / 0.4) : 0;
  const jump = Math.sin(Math.PI * lunge) * 14;
  const tilt = (tap ? Math.sign(tap.lane) * (sprinting ? 9 * Math.sin(Math.PI * dash) : 0) : 0) + (tp !== undefined && tap ? Math.sign(tap.lane || 1) * 14 * Math.sin(Math.PI * lunge) : 0);

  const ripple = goalIn ? { x: goalTarget.x, y: goalTarget.y, p: clamp01((sinceStrike - 0.5) / 0.5) } : null;
  const verdictText = (() => {
    switch (v) {
      case 'perfect':
        return { big: t('POACHED!'), sub: t('Right place, right moment.'), tone: 'text-gold-300' };
      case 'good':
        return { big: t('GOT THERE!'), sub: t('You squeezed it in before he arrived.'), tone: 'text-neon-300' };
      case 'early':
        return { big: t('TOO EARLY'), sub: t('The ball was still in the air.'), tone: 'text-crimson-300' };
      case 'late':
        return { big: t('CLEARED!'), sub: t('A defender got there first.'), tone: 'text-crimson-300' };
      case 'wrong':
        return { big: t('WRONG SPOT'), sub: t('The ball fell somewhere else.'), tone: 'text-crimson-300' };
      default:
        return null;
    }
  })();
  const showVerdict = !!verdictText && (v === 'late' ? local > tc + 0.05 : sinceStrike > 0.12 || (tp !== undefined && local > tp + 0.12));

  // standing players: two defenders, a team-mate looking for the rebound
  const others = [
    { x: -1.15, d: 0.3, kitC: oppKit, k: 0 },
    { x: 1.2, d: 0.42, kitC: oppKit, k: 1 },
    { x: 0.55, d: 0.2, kitC: kit, k: 2 },
  ];
  const standing = others.map((o) => {
    // they never stand still: they shuffle, and drift towards the ball
    const sway = Math.sin(clock * 1.7 + o.k * 2.1) * 0.07 + (playing && local > 0 ? clamp01(local / 1.2) * (pose.x - o.x) * 0.12 : 0);
    const p = project(o.x + sway, o.d, 0);
    return { ...o, lane: o.x, sx: p.x, sy: p.y - (o.k === 2 && celebrating ? Math.abs(Math.sin(clock * 9)) * 5 : 0), z: p.z };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{t('Ricochet')} {Math.min(ROUNDS, round + 1)}/{ROUNDS}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span key={i} className={cn('h-2.5 w-7 rounded-full transition-colors', shown[i] === undefined ? 'bg-white/15' : shown[i] === 'perfect' || shown[i] === 'good' ? 'bg-neon-400' : 'bg-crimson-500')} />
          ))}
        </div>
      </div>

      <div className="relative select-none overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ transform: shake ? `translateX(${shake}px)` : undefined }}>
          <g transform={`translate(${zcx * (1 - zoom)} ${zcy * (1 - zoom)}) scale(${zoom})`}>
          <Box keeper={{ side: keeperSide, dive: keeperDive }} keeperKit="#f59e0b" ripple={ripple} />

          {standing.map((o) => (
            <FrontPlayer key={o.k} x={o.sx} y={o.sy} s={sizeAt(o.z)} kit={o.kitC} skin={SKINS[o.k % SKINS.length]} hair="#18120c" lean={Math.max(-1, Math.min(1, (pose.x - o.lane) * 0.4))} kick={0} arms={o.k === 2 && celebrating ? 'up' : 'balance'} stride={playing ? clock * 2.6 + o.k : undefined} />
          ))}
          {playing && !clearerHidden && local > 0 && (
            <FrontPlayer x={cP.x} y={cP.y} s={sizeAt(cP.z)} kit={oppKit} skin={SKINS[1]} hair="#18120c" lean={Math.max(-1, Math.min(1, (rd.lane - clearer.x) * 0.5))} kick={clearKick} arms="balance" stride={local < tc - 0.28 ? clock * 11 : undefined} />
          )}

          {/* the burst of the save */}
          {parry >= 0 && (
            <g transform={`translate(${parryAt.x} ${parryAt.y})`} opacity={1 - parry}>
              <circle r={4 + parry * 26} fill="none" stroke="#fff" strokeWidth="2" />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return <line key={i} x1={Math.cos(a) * (8 + parry * 20)} y1={Math.sin(a) * (8 + parry * 20)} x2={Math.cos(a) * (16 + parry * 34)} y2={Math.sin(a) * (16 + parry * 34)} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />;
              })}
            </g>
          )}
          {/* the ball and its shadow on the turf */}
          <ellipse cx={project(pose.x, pose.d, 0).x} cy={project(pose.x, pose.d, 0).y + 1} rx={7 * sizeAt(ball.z) * 0.8} ry={2 * sizeAt(ball.z) * 0.8} fill="#000" opacity={0.3 - Math.min(0.15, pose.h * 0.08)} />
          {trail.map((q, i) => (
            <circle key={i} cx={q.x} cy={q.y - 6 * sizeAt(q.z)} r={Math.max(2, 7 * sizeAt(q.z) * (1 - i * 0.18))} fill="#fff" opacity={0.28 - i * 0.06} />
          ))}
          {playing && local > -PRE && (
            <g transform={`translate(${ball.x} ${ball.y - 6 * sizeAt(ball.z)}) rotate(${clock * 520})`}>
              <circle r={Math.max(3.2, 8 * sizeAt(ball.z))} fill="#fafafa" stroke="#18181b" strokeWidth=".7" />
              <circle r={Math.max(1.2, 3 * sizeAt(ball.z))} fill="#18181b" />
            </g>
          )}
          {!playing && (
            <g transform={`translate(${project(0, 0.03, 0.9).x} ${project(0, 0.03, 0.9).y})`}>
              <circle r="3.6" fill="#fafafa" stroke="#18181b" strokeWidth=".6" />
            </g>
          )}

          <g transform={`translate(0 ${-jump})`}>
            <BackPlayer x={youX} y={YP + 8} s={1.4} kit={kit} skin={skin} hair={hair} step={clock * 11} tilt={tilt} stretch={tp !== undefined ? 1 : 0} dir={tap && tap.lane !== 0 ? tap.lane : 1} run={sprinting ? 2.6 : 0.6} />
          </g>
          </g>
        </svg>
        {tension > 0.05 && <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(220,38,38,${0.38 * tension}) 100%)` }} />}

        {playing && (
          <div className="absolute inset-0 grid grid-cols-3">
            {([-1, 0, 1] as Lane[]).map((l) => (
              <button key={l} aria-label={l < 0 ? t('LEFT') : l > 0 ? t('RIGHT') : t('CENTRE')} onPointerDown={(e) => { e.preventDefault(); choose(l); }} className="touch-none" />
            ))}
          </div>
        )}
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 px-4 text-center text-[11px] font-semibold text-white/80">{t('Tap the lane where the ball will drop.')}</div>}
        {playing && local >= -PRE && v === undefined && <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-bold text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{t('Where will it fall?')}</div>}

        <AnimatePresence>
          {showVerdict && verdictText && (
            <motion.div key={round} initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <div className={cn('font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]', verdictText.tone)}>{verdictText.big}</div>
              <div className="text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{verdictText.sub}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {scored && sinceStrike > 0.5 && sinceStrike < 0.65 && <div className="pointer-events-none absolute inset-0 bg-white/25" />}
      </div>

      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          <Zap className="h-5 w-5" /> {t('START')}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {([-1, 0, 1] as Lane[]).map((l) => (
            <button
              key={l}
              onPointerDown={(e) => {
                e.preventDefault();
                choose(l);
              }}
              disabled={!playing || locked || shown[round] !== undefined}
              className={cn('flex h-20 touch-none select-none flex-col items-center justify-center rounded-2xl font-display text-xs font-extrabold uppercase tracking-wide shadow-lg transition active:scale-95 disabled:opacity-40', picked === l && shown[round] !== undefined ? 'bg-gradient-to-b from-gold-300 to-gold-500 text-zinc-950' : 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950')}
            >
              {l < 0 ? <ChevronLeft className="h-9 w-9" /> : l > 0 ? <ChevronRight className="h-9 w-9" /> : <Zap className="h-8 w-8" />}
              {l < 0 ? t('LEFT') : l > 0 ? t('RIGHT') : t('CENTRE')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
