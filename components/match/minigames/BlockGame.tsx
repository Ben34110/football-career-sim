'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SHOTS, STRIKE, blockQuality, judgeBlock, makeBlock, moveToward, planEnd, shotArrive, shotLaunch, shotStart, type Lane } from '@/lib/engine/minigames/block';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ActionButton, CountOverlay, shade, useClock, useStartFlow, type SceneProps } from './shared';

const W = 340;
const H = 220;
const CX = 170;
/** Distance between two lanes on the pitch line you defend */
const LANE = 86;
const laneX = (l: number) => CX + l * LANE;
/** The shooter's feet, the line you defend, and your feet */
const SHOOTER_Y = 112;
const LINE_Y = 170;
const YOU_Y = 209;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/* ───────────────────────── the shooter, seen from the front ───────────────────────── */

/**
 * He faces you. His head, his shoulders and his standing foot lean where he will shoot;
 * `kick` winds the other leg back (−1) and swings it through (+1).
 */
function Shooter({ x, y, s, kit, skin, hair, lean, kick, arms }: { x: number; y: number; s: number; kit: string; skin: string; hair: string; lean: number; kick: number; arms: 'balance' | 'up' | 'head' }) {
  const dark = shade(kit, -0.35);
  const back = Math.max(0, -kick);
  const fwd = Math.max(0, kick);
  const kickFoot: [number, number] = [-6 - back * 6 + fwd * 9, -back * 13 - fwd * 3];
  const plantFoot: [number, number] = [7 + lean * 8, 0];
  const hipL: [number, number] = [-4.5, -24];
  const hipR: [number, number] = [4.5, -24];
  const kneeL: [number, number] = [(hipL[0] + kickFoot[0]) / 2 - 1.5, -13 + kickFoot[1] * 0.35];
  const kneeR: [number, number] = [(hipR[0] + plantFoot[0]) / 2 + 1, -12.5];
  const leg = (hip: [number, number], knee: [number, number], foot: [number, number]) => (
    <g strokeLinecap="round" fill="none">
      <path d={`M${hip[0]} ${hip[1]}L${knee[0].toFixed(1)} ${knee[1].toFixed(1)}`} stroke={skin} strokeWidth="5.4" />
      <path d={`M${knee[0].toFixed(1)} ${knee[1].toFixed(1)}L${foot[0].toFixed(1)} ${foot[1].toFixed(1)}`} stroke={kit} strokeWidth="5" />
      <ellipse cx={foot[0]} cy={foot[1] + 1} rx="4.6" ry="2.6" fill="#0b0b0f" />
    </g>
  );
  const hand = (side: -1 | 1): [number, number] => {
    if (arms === 'up') return [side * 17, -68];
    if (arms === 'head') return [side * 5.5, -60];
    // arms out for balance; the far one rises when he leans
    return [side * 21, -35 - side * lean * 5];
  };
  const arm = (side: -1 | 1) => {
    const h = hand(side);
    const el: [number, number] = [side * (arms === 'balance' ? 17 : arms === 'up' ? 15 : 14), arms === 'balance' ? -39 : arms === 'up' ? -55 : -50];
    return <path d={`M${side * 10.5} -44L${el[0]} ${el[1]}L${h[0].toFixed(1)} ${h[1].toFixed(1)}`} stroke={skin} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="16" ry="3.4" fill="#000" opacity=".3" />
      {leg(hipL, kneeL, kickFoot)}
      {leg(hipR, kneeR, plantFoot)}
      {kick > 0.2 && <path d={`M${kickFoot[0] - 9} ${kickFoot[1] - 6}Q${kickFoot[0] - 2} ${kickFoot[1] - 12} ${kickFoot[0] + 8} ${kickFoot[1] - 6}`} stroke="#fff" strokeWidth="1.2" fill="none" opacity=".55" />}
      <g transform={`rotate(${lean * 7} 0 -24)`}>
        <rect x="-9.5" y="-29" width="19" height="9" rx="3" fill="#f4f4f5" />
        {arm(-1)}
        {arm(1)}
        <path d="M-11.500 -45Q0 -49 11.500 -45L9.500 -26H-9.500Z" fill={kit} stroke={dark} strokeWidth=".8" />
        <path d="M-3 -46.500Q0 -43 3 -46.500" stroke={dark} strokeWidth="1" fill="none" />
        <rect x="-2" y="-50" width="4" height="5" rx="1.500" fill={skin} />
        <g transform={`translate(${lean * 2.2} 0)`}>
          <circle cx="0" cy="-55.500" r="7" fill={skin} />
          <path d="M-7.200 -56C-7 -64 7 -64 7.200 -56C5 -59.500 -5 -59.500 -7.200 -56Z" fill={hair} />
          <ellipse cx="-2.800" cy="-55.200" rx="1.900" ry="1.500" fill="#fff" />
          <ellipse cx="2.800" cy="-55.200" rx="1.900" ry="1.500" fill="#fff" />
          <circle cx={-2.800 + lean * 1.1} cy="-55.200" r=".95" fill="#111827" />
          <circle cx={2.800 + lean * 1.1} cy="-55.200" r=".95" fill="#111827" />
          <path d={arms === 'up' ? 'M-2.500 -51.500Q0 -48.500 2.500 -51.500Z' : arms === 'head' ? 'M-2.200 -50.500Q0 -52 2.200 -50.500' : 'M-2 -51Q0 -50.200 2 -51'} stroke="#7c2d12" strokeWidth=".9" fill={arms === 'up' ? '#7c2d12' : 'none'} />
        </g>
      </g>
    </g>
  );
}

/* ───────────────────────── you, seen from behind ───────────────────────── */

/** You, in front of the camera: knees bent, arms wide. `stretch` throws you towards `dir`. */
function Defender({ x, y, s, kit, skin, hair, step, tilt, stretch, dir }: { x: number; y: number; s: number; kit: string; skin: string; hair: string; step: number; tilt: number; stretch: number; dir: number }) {
  const dark = shade(kit, -0.35);
  const sw = Math.sin(step);
  const footL: [number, number] = [-10 - sw * 3, -Math.max(0, sw) * 3];
  const footR: [number, number] = [10 - sw * 3, -Math.max(0, -sw) * 3];
  const leg = (hipX: number, foot: [number, number]) => {
    const knee: [number, number] = [hipX + (foot[0] - hipX) * 0.45 + Math.sign(hipX) * 2.5, -12.5];
    return (
      <g strokeLinecap="round" fill="none">
        <path d={`M${hipX} -23L${knee[0].toFixed(1)} ${knee[1]}`} stroke={skin} strokeWidth="6" />
        <path d={`M${knee[0].toFixed(1)} ${knee[1]}L${foot[0].toFixed(1)} ${foot[1].toFixed(1)}`} stroke={kit} strokeWidth="5.600" />
        <ellipse cx={foot[0]} cy={foot[1] + 1} rx="5.200" ry="2.800" fill="#0b0b0f" />
      </g>
    );
  };
  const side = Math.sign(dir) || 1;
  const arm = (a: -1 | 1) => {
    const reaching = stretch > 0.01 && a === side;
    const hand: [number, number] = reaching ? [a * (22 + stretch * 10), -38 - stretch * 34] : [a * 22, -33 + (stretch > 0.01 ? stretch * 6 : 0)];
    const el: [number, number] = reaching ? [a * (19 + stretch * 4), -44 - stretch * 10] : [a * 18, -40];
    return (
      <g>
        <path d={`M${a * 11} -45L${el[0]} ${el[1]}L${hand[0].toFixed(1)} ${hand[1].toFixed(1)}`} stroke={skin} strokeWidth="4.400" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={hand[0]} cy={hand[1]} r="3" fill={skin} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="19" ry="4" fill="#000" opacity=".32" />
      {leg(-5, footL)}
      {leg(5, footR)}
      <rect x="-10.500" y="-30" width="21" height="10" rx="3.500" fill="#f4f4f5" />
      {arm(-1)}
      {arm(1)}
      <path d="M-12.500 -46Q0 -50 12.500 -46L10 -27H-10Z" fill={kit} stroke={dark} strokeWidth=".9" />
      <path d="M0 -47V-27" stroke={dark} strokeWidth=".7" opacity=".4" />
      <text x="0" y="-33" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" opacity=".92" fontFamily="sans-serif">
        10
      </text>
      <rect x="-2.500" y="-51" width="5" height="6" rx="2" fill={skin} />
      <circle cx="-7.300" cy="-56.500" r="1.800" fill={skin} />
      <circle cx="7.300" cy="-56.500" r="1.800" fill={skin} />
      <circle cx="0" cy="-57" r="7.400" fill={skin} />
      <path d="M-7.600 -56C-7.800 -66 7.800 -66 7.600 -56C7 -52 5 -51 0 -51C-5 -51 -7 -52 -7.600 -56Z" fill={hair} />
    </g>
  );
}

/* ───────────────────────── the pitch, from behind you ───────────────────────── */

function PitchView({ target, pos }: { target: number; pos: number }) {
  const rows = Array.from({ length: 9 }, (_, k) => 62 + (H - 62) * Math.pow(k / 8, 1.65));
  return (
    <g>
      <defs>
        <linearGradient id="bk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050b1d" />
          <stop offset="1" stopColor="#173a6b" />
        </linearGradient>
        <linearGradient id="bk-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14562f" />
          <stop offset="1" stopColor="#0c3d22" />
        </linearGradient>
      </defs>
      <rect width={W} height="64" fill="url(#bk-sky)" />
      <g opacity=".55">
        {Array.from({ length: 38 }, (_, i) => (
          <circle key={i} cx={i * 9.2 + 3} cy={46 - ((i * 7) % 11)} r={3.600} fill={['#b45309', '#e5e7eb', '#1d4ed8', '#fbbf24', '#9ca3af'][i % 5]} opacity=".55" />
        ))}
      </g>
      <rect y="56" width={W} height="7" fill="#0b1220" />
      <rect y="58" width={W} height="2" fill="#10e08a" opacity=".5" />
      <rect y="63" width={W} height={H - 63} fill="url(#bk-grass)" />
      {rows.slice(0, -1).map((y, k) => (k % 2 === 0 ? <rect key={k} y={y} width={W} height={rows[k + 1] - y} fill="#fff" opacity=".035" /> : null))}
      {/* the penalty area */}
      <path d={`M${CX - 150} ${H}L${CX - 74} 104L${CX + 74} 104L${CX + 150} ${H}`} fill="none" stroke="#fff" strokeWidth="1.400" opacity=".4" />
      <path d={`M${CX - 74} 104H${CX + 74}`} stroke="#fff" strokeWidth="1.600" opacity=".5" />
      {/* the three lanes, as a fan from his foot */}
      {[-1, 0, 1].map((l) => {
        const here = Math.abs(pos - l) < 0.5;
        const spread = 36;
        return <path key={l} d={`M${CX - 3} ${SHOOTER_Y + 2}L${laneX(l) - spread} ${H}L${laneX(l) + spread} ${H}L${CX + 3} ${SHOOTER_Y + 2}Z`} fill={here ? '#34d399' : '#ffffff'} opacity={here ? 0.18 : 0.04} />;
      })}
      {[-1, 0, 1].map((l) => (
        <ellipse key={l} cx={laneX(l)} cy={YOU_Y + 2} rx="38" ry="8" fill="none" stroke={l === target ? '#34d399' : '#fff'} strokeWidth={l === target ? 2 : 1} opacity={l === target ? 0.9 : 0.22} />
      ))}
    </g>
  );
}

/* ───────────────────────── the game ───────────────────────── */

/**
 * Block the shot. He faces you and winds up: his eyes, shoulders and standing foot show where the ball is going —
 * unless he dummies. Slide to the lane before the ball reaches you. Three shots, three chances to throw yourself in front.
 */
export function BlockGame({ pressure, difficulty, bonus, locked, kit, oppKit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const plan = useMemo(() => makeBlock(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock } = useClock(playing);

  const [lane, setLane] = useState<Lane>(0);
  const target = useRef<Lane>(0);
  const pos = useRef(0);
  const lastClock = useRef(0);
  const [results, setResults] = useState<boolean[]>([]);
  const resultsRef = useRef<boolean[]>([]);
  const done = useRef(false);

  // you slide towards the lane you picked, at a fixed speed
  if (playing) {
    const dt = Math.min(0.05, Math.max(0, clock - lastClock.current));
    pos.current = moveToward(pos.current, target.current, dt, plan.speed);
    lastClock.current = clock;
  }

  const pick = (l: Lane) => {
    if (locked || flow.stage === 'idle' || done.current) return;
    if (target.current !== l) haptic(8);
    target.current = l;
    setLane(l);
  };

  // judge each shot the moment the ball reaches you
  useEffect(() => {
    if (!playing || done.current) return;
    for (let i = 0; i < SHOTS; i++) {
      if (clock >= shotArrive(plan, i) && resultsRef.current[i] === undefined) {
        const { ok } = judgeBlock(pos.current, plan.shots[i].dir, plan.reach);
        resultsRef.current = [...resultsRef.current];
        resultsRef.current[i] = ok;
        setResults(resultsRef.current);
        haptic(ok ? [20, 20, 40] : 80);
      }
    }
    if (clock >= shotArrive(plan, SHOTS - 1) + 0.85) {
      done.current = true;
      onStop(blockQuality(resultsRef.current.filter(Boolean).length));
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── the picture right now ───── */
  const idx = playing ? Math.min(SHOTS - 1, Math.max(0, Math.floor(clock / shotStart(plan, 1)))) : 0;
  const shot = plan.shots[idx];
  const ti = playing ? clock - shotStart(plan, idx) : 0;
  const launch = shotLaunch(plan, idx) - shotStart(plan, idx);
  const phase = ti < plan.windup ? 'windup' : ti < launch ? 'strike' : ti < launch + plan.flight ? 'flight' : 'after';
  const result = results[idx];
  const post = Math.max(0, ti - (launch + plan.flight));

  // him
  const tellK = smooth((ti - 0.2) / 0.6);
  const lean = phase === 'after' || !playing ? 0 : shot.tell * tellK;
  const wind = smooth((ti - (plan.windup - 0.45)) / 0.4);
  const kick = phase === 'windup' ? -wind : phase === 'strike' ? -1 + ((ti - plan.windup) / STRIKE) * 2 : phase === 'flight' ? Math.max(0, 1 - (ti - launch) * 4) : 0;
  const shooterArms: 'balance' | 'up' | 'head' = phase === 'after' && result !== undefined ? (result ? 'head' : 'up') : 'balance';
  const hop = phase === 'after' && result === false ? Math.abs(Math.sin(post * 9)) * 5 * Math.exp(-post * 1.5) : 0;

  // the ball
  const u = phase === 'flight' ? (ti - launch) / plan.flight : phase === 'after' ? 1 : 0;
  const ue = Math.pow(u, 1.25);
  const dx = laneX(shot.dir);
  let bx = CX + (dx - CX) * ue + (phase === 'windup' || phase === 'strike' ? lean * 2 : 0);
  let by = phase === 'flight' || phase === 'after' ? SHOOTER_Y - 6 + (LINE_Y - SHOOTER_Y + 6) * ue - Math.sin(Math.PI * ue) * 10 : SHOOTER_Y - 6 + (phase === 'strike' ? -1 : 0);
  let br = 3.4 + 12.5 * Math.pow(ue, 1.5);
  let bo = 1;
  const side = shot.dir !== 0 ? shot.dir : idx % 2 === 0 ? 1 : -1;
  if (phase === 'after' && result === true) {
    const k = 1 - Math.exp(-post * 3.4);
    bx = dx + side * 120 * k;
    by = LINE_Y - 150 * post + 330 * post * post;
    br = 16 - post * 7;
    bo = 1 - clamp01((post - 0.5) / 0.35);
  } else if (phase === 'after' && result === false) {
    bx = dx + side * 40 * post;
    by = LINE_Y + 120 * post;
    br = 16 + post * 70;
    bo = 1 - clamp01(post / 0.45);
  }
  const rot = phase === 'flight' ? u * 700 : post * 500;

  // you
  const px = laneX(pos.current);
  const moving = Math.abs(target.current - pos.current);
  const dive = result === undefined || phase !== 'after' ? 0 : result ? Math.sin(clamp01(post / 0.55) * Math.PI) : 0;
  const flinch = result === false && phase === 'after' ? Math.exp(-post * 4) : 0;
  const tilt = (target.current - pos.current) * 7 * clamp01(moving * 3) + dive * Math.sign(shot.dir || side) * 22 + flinch * Math.sign(shot.dir || side) * 6;
  const youX = px + dive * Math.sign(shot.dir || side) * 12;

  const showVerdict = playing && phase === 'after' && result !== undefined;
  const pips = Array.from({ length: SHOTS }, (_, i) => results[i]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{t('Shot')} {Math.min(SHOTS, idx + 1)}/{SHOTS}</span>
        <div className="flex gap-1.5">
          {pips.map((r, i) => (
            <span key={i} className={cn('h-2.5 w-7 rounded-full transition-colors', r === undefined ? 'bg-white/15' : r ? 'bg-neon-400' : 'bg-crimson-500')} />
          ))}
        </div>
      </div>

      <div className="relative select-none overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ transform: result === false && phase === 'after' ? `translateX(${Math.sin(post * 90) * 3 * Math.exp(-post * 5)}px)` : undefined }}>
          <PitchView target={lane} pos={pos.current} />
          <Shooter x={CX} y={SHOOTER_Y - hop} s={1.12} kit={oppKit} skin="#c68642" hair="#18120c" lean={lean} kick={kick} arms={shooterArms} />
          {/* the ball's shadow, then the ball */}
          <ellipse cx={bx} cy={phase === 'flight' ? SHOOTER_Y + 3 + (YOU_Y - SHOOTER_Y) * Math.pow(ue, 1.4) : SHOOTER_Y + 4} rx={br * 0.9} ry={br * 0.28} fill="#000" opacity={0.28 * bo} />
          <g opacity={bo} transform={`translate(${bx} ${by}) rotate(${rot})`}>
            <circle r={br} fill="#fafafa" stroke="#18181b" strokeWidth={Math.max(0.6, br * 0.07)} />
            <polygon points={`0,${-br * 0.5} ${br * 0.48},${-br * 0.15} ${br * 0.3},${br * 0.4} ${-br * 0.3},${br * 0.4} ${-br * 0.48},${-br * 0.15}`} fill="#18181b" />
          </g>
          <Defender x={youX} y={YOU_Y} s={1.5} kit={kit} skin={skin} hair={hair} step={pos.current * 16} tilt={tilt} stretch={dive} dir={shot.dir || side} />
          {/* impact when it is blocked */}
          {phase === 'after' && result === true && post < 0.3 && (
            <g transform={`translate(${dx} ${LINE_Y})`} opacity={1 - post / 0.3}>
              <circle r={6 + post * 70} fill="none" stroke="#bbf7d0" strokeWidth="2.500" />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return <line key={i} x1={Math.cos(a) * (12 + post * 50)} y1={Math.sin(a) * (12 + post * 50)} x2={Math.cos(a) * (20 + post * 80)} y2={Math.sin(a) * (20 + post * 80)} stroke="#fff" strokeWidth="1.600" strokeLinecap="round" />;
              })}
            </g>
          )}
        </svg>

        {/* tap the lane you want to cover */}
        {playing && (
          <div className="absolute inset-0 grid grid-cols-3">
            {([-1, 0, 1] as Lane[]).map((l) => (
              <button key={l} aria-label={l < 0 ? t('LEFT') : l > 0 ? t('RIGHT') : t('CENTRE')} onPointerDown={(e) => { e.preventDefault(); pick(l); }} className="touch-none" />
            ))}
          </div>
        )}

        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 px-4 text-center text-[11px] font-semibold text-white/80">{t('Slide to the lane he is aiming at.')}</div>}
        {playing && phase === 'windup' && <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-bold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{t('Read his body…')}</div>}

        <AnimatePresence>
          {showVerdict && (
            <motion.div key={idx} initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <div className={cn('font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]', result ? 'text-neon-300' : 'text-crimson-300')}>{result ? t('BLOCKED!') : t('GOAL FOR THEM')}</div>
              <div className="text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{result ? t('You threw yourself in front of it.') : shot.tell !== shot.dir ? t('He dummied you.') : t('You were in the wrong lane.')}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {showVerdict && result === false && <motion.div key={`f${idx}`} initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-none absolute inset-0 bg-crimson-600/50" />}
      </div>

      <div className="px-1 text-center text-[10px] font-semibold leading-snug text-white/55">{t('His eyes, shoulders and standing foot show where he will shoot. Beware of dummies.')}</div>

      {flow.stage === 'idle' ? (
        <ActionButton onPress={flow.start} label={t('START')} icon={<Shield className="h-5 w-5" />} />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {([-1, 0, 1] as Lane[]).map((l) => (
            <button
              key={l}
              onPointerDown={(e) => {
                e.preventDefault();
                pick(l);
              }}
              disabled={flow.stage !== 'play' || locked}
              className={cn('flex h-16 touch-none select-none flex-col items-center justify-center rounded-2xl font-display text-xs font-extrabold uppercase tracking-wide shadow-lg transition active:scale-95 disabled:opacity-40', lane === l ? 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950' : 'bg-white/10 text-white')}
            >
              {l < 0 ? <ChevronLeft className="h-7 w-7" /> : l > 0 ? <ChevronRight className="h-7 w-7" /> : <Shield className="h-6 w-6" />}
              {l < 0 ? t('LEFT') : l > 0 ? t('RIGHT') : t('CENTRE')}
            </button>
          ))}
        </div>
      )}
      <span className="hidden">{planEnd(plan)}</span>
    </div>
  );
}
