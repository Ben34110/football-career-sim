'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTACT_K, SWING, ballAt, footAt, legPose, makeVolley, simulateVolley, type VolleyOutcome } from '@/lib/engine/minigames/volley';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FrontPlayer } from './figures';
import { ActionButton, CountOverlay, PitchSide, shade, useClock, useStartFlow, type SceneProps } from './shared';

const W = 340;
const H = 190;
const GROUND = 160;
const S = 1.45;
const BALL_R = 8;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Slow motion around the strike */
const SLOW = 0.35;
const SPAN = 0.4;
const warp = (c: number, a: number) => (c <= a ? c : c <= a + SPAN / SLOW ? a + (c - a) * SLOW : a + SPAN + (c - a - SPAN / SLOW));
const unwarp = (s: number, a: number) => (s <= a ? s : s <= a + SPAN ? a + (s - a) / SLOW : a + SPAN / SLOW + (s - a - SPAN));

/* The geometry of the strike: where his standing foot has to be so that the boot meets the ball at (XC, YC) */
const [FOOT_X, FOOT_Y] = footAt(CONTACT_K);
const XC = 146;
const YC = GROUND + FOOT_Y * S - 3;
const PLX = XC + FOOT_X * S;

/* ───────────────────────── the striker, side-on, facing the goal on the left ───────────────────────── */

function Striker({ x, y, s, kit, skin, hair, k, lean, arm }: { x: number; y: number; s: number; kit: string; skin: string; hair: string; k: number; lean: number; arm: number }) {
  const dark = shade(kit, -0.35);
  const { thigh, flex } = legPose(k);
  const knee: [number, number] = [11 * Math.sin(thigh), -21 + 11 * Math.cos(thigh)];
  const sa = thigh - flex;
  const foot: [number, number] = [knee[0] + 11 * Math.sin(sa), knee[1] + 11 * Math.cos(sa)];
  const f = (n: number) => n.toFixed(1);
  // the arms balance the kick: the near one goes back as the leg comes through
  const shoulder: [number, number] = [0.5, -37];
  const handNear: [number, number] = [shoulder[0] + 11 * Math.sin(-arm * 1.2 - 0.2), shoulder[1] + 11 * Math.cos(-arm * 1.2 - 0.2)];
  const handFar: [number, number] = [shoulder[0] + 11 * Math.sin(arm * 1.1 + 0.4), shoulder[1] + 11 * Math.cos(arm * 1.1 + 0.4)];
  const boot = (cx: number, cy: number, ang: number) => (
    <g transform={`translate(${f(cx)} ${f(cy)}) rotate(${f(-ang * 40)})`}>
      <ellipse cx="2" cy="0.8" rx="5" ry="2.5" fill="#0b0b0f" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${-s} ${s})`}>
      <ellipse cx="2" cy="1" rx="17" ry="3.2" fill="#000" opacity=".28" />
      {/* the standing leg, bent a little, planted */}
      <path d={`M0 -21L2 -11L-1.5 -1`} stroke={shade(skin, -0.14)} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {boot(-1.5, -0.5, 0)}
      <g transform={`rotate(${f(lean * 57.3)} 0 -21)`}>
        <path d={`M${f(shoulder[0])} ${f(shoulder[1])}L${f(handFar[0])} ${f(handFar[1])}`} stroke={shade(skin, -0.14)} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="-6.5" y="-26" width="13" height="7.500" rx="2.500" fill="#f4f4f5" />
        <rect x="-6.500" y="-41" width="13" height="18" rx="4.500" fill={kit} stroke={dark} strokeWidth=".8" />
        <circle cx="1.500" cy="-47" r="6.300" fill={skin} />
        <path d="M-4 -49C-3.500 -55 6 -54.500 7.500 -48C5 -50.500 -1 -50.500 -4 -49Z" fill={hair} />
        <path d={`M${f(shoulder[0])} ${f(shoulder[1])}L${f(handNear[0])} ${f(handNear[1])}`} stroke={skin} strokeWidth="3.600" strokeLinecap="round" />
      </g>
      {/* the kicking leg, in front */}
      <path d={`M0 -21L${f(knee[0])} ${f(knee[1])}`} stroke={skin} strokeWidth="4.800" strokeLinecap="round" />
      <path d={`M${f(knee[0])} ${f(knee[1])}L${f(foot[0])} ${f(foot[1])}`} stroke={kit} strokeWidth="4.400" strokeLinecap="round" />
      {boot(foot[0], foot[1], sa)}
    </g>
  );
}

/* ───────────────────────── the goal, seen from behind the striker ───────────────────────── */

function GoalCam({ p, quality, kit }: { p: number; quality: 'perfect' | 'good'; kit: string }) {
  const perfect = quality === 'perfect';
  // where the ball ends up, and where the keeper goes
  const target: [number, number] = perfect ? [27, 19] : [31, 41];
  const e = smooth(p);
  const bx = lerp(58, target[0], e);
  const by = lerp(68, target[1], e) - Math.sin(e * Math.PI) * 6;
  const br = lerp(7, 3.4, e);
  // the keeper dives: the right way but too late for a good strike, the wrong way for a perfect one
  const dive = smooth((p - (perfect ? 0.12 : 0.3)) / 0.7);
  const dir = perfect ? 1 : -1;
  const kx = 58 + dir * dive * (perfect ? 14 : 12);
  const ky = 52 - dive * (perfect ? 4 : 2);
  const ang = dir * dive * (perfect ? 62 : 70);
  const ripple = clamp01((p - 0.92) / 0.2);
  return (
    <g>
      <defs>
        <clipPath id="vgc">
          <rect width="116" height="76" rx="11" />
        </clipPath>
        <pattern id="vnet" width="4.500" height="4.500" patternUnits="userSpaceOnUse">
          <path d="M0 0L4.500 4.500M4.500 0L0 4.500" stroke="#fff" strokeWidth=".4" opacity=".5" />
        </pattern>
      </defs>
      <g clipPath="url(#vgc)">
        <rect width="116" height="76" fill="#0b1d17" />
        <rect y="52" width="116" height="24" fill="#14562f" />
        <rect x="14" y="12" width="88" height="40" fill="url(#vnet)" opacity=".8" />
        <rect x="14" y="12" width="88" height="40" fill="#000" opacity=".25" />
        {ripple > 0 && <circle cx={target[0]} cy={target[1]} r={4 + ripple * 22} fill="#fff" opacity={0.5 * (1 - ripple)} />}
        <g transform={`rotate(${ang.toFixed(1)} ${kx.toFixed(1)} ${(ky - 12).toFixed(1)})`}>
          <FrontPlayer x={kx} y={ky} s={0.5} kit="#f59e0b" skin="#e0b896" hair="#27272a" lean={0} kick={0} arms={dive > 0.3 ? 'up' : 'balance'} />
        </g>
        <path d="M14 52V12H102V52" stroke="#fff" strokeWidth="2.600" strokeLinejoin="round" fill="none" />
        <g transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}>
          <circle r={br} fill="#fafafa" stroke="#18181b" strokeWidth=".6" />
          <circle r={br * 0.38} fill="#18181b" />
        </g>
        {/* the striker's shoulder, bottom of the picture */}
        <ellipse cx="58" cy="82" rx="26" ry="12" fill={kit} opacity=".9" />
      </g>
      <rect width="116" height="76" rx="11" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.200" />
    </g>
  );
}

/* ───────────────────────── the game ───────────────────────── */

/**
 * Volley. A cross drops from the night sky and bounces; you cock your leg and swing it through the ball.
 * The swing takes a moment, so start it just before the ball reaches your boot — a soft ring marks the spot.
 */
export function VolleyGame({ bonus, pressure, difficulty, locked, kit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const p = useMemo(() => makeVolley(pressure, difficulty, bonus, GROUND - BALL_R + 2, XC, YC), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref } = useClock(playing);
  const [res, setRes] = useState<{ tTap: number; out: VolleyOutcome } | null>(null);
  const done = useRef(false);

  const finish = (q: 'perfect' | 'good' | 'miss') => {
    if (done.current) return;
    done.current = true;
    onStop(q);
  };

  const strike = () => {
    if (!playing || res || locked) return;
    const tt = ref.current;
    setRes({ tTap: tt, out: simulateVolley(p, tt) });
    haptic(20);
  };

  /* ───── time: slow motion around the strike ───── */
  const hit = res && (res.out.kind === 'perfect' || res.out.kind === 'good') ? res.out : null;
  const tc = res ? res.out.tContact : null;
  const slowFrom = res ? res.tTap : 0;
  const st = hit ? warp(clock, slowFrom) : clock;

  useEffect(() => {
    if (!res) return;
    const sceneEnd = res.out.tContact + (hit ? 1.25 : 1.0);
    const realEnd = hit ? unwarp(sceneEnd, slowFrom) : sceneEnd;
    const q = res.out.kind === 'perfect' ? 'perfect' : res.out.kind === 'good' ? 'good' : 'miss';
    const id = setTimeout(() => finish(q), Math.max(0, (realEnd - ref.current) * 1000));
    return () => clearTimeout(id);
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  // never swung: the ball has bounced away
  useEffect(() => {
    if (playing && !res && clock > p.tIdeal + 0.7) finish('miss');
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── the leg ───── */
  const idle = !playing;
  const cock = -0.12 - 0.72 * smooth((st - (p.tIdeal - 0.95)) / 0.65); // he gets ready as the ball comes down
  let k = idle ? 0 : cock;
  let arm = idle ? 0 : -cock * 0.5;
  if (res && tc !== null) {
    const kStart = Math.max(-1, -0.12 - 0.72 * smooth((res.tTap - (p.tIdeal - 0.95)) / 0.65));
    const s = (st - res.tTap) / SWING;
    k = s <= 1 ? kStart + (CONTACT_K - kStart) * s * s : CONTACT_K + (1 - CONTACT_K) * (1 - Math.pow(1 - clamp01((s - 1) / 1.8), 2));
    arm = k * 0.9;
  }
  const lean = res ? -0.28 * smooth(1 - Math.abs(k - 0.1)) + 0.1 * smooth((k - CONTACT_K) / 0.45) : playing ? -0.28 * smooth((st - (p.tIdeal - 0.8)) / 0.6) : 0;

  /* ───── the ball ───── */
  const free = ballAt(p, Math.max(0, playing ? st : 0));
  let bx = free.x;
  let by = free.y;
  let rot = st * 160;
  let trail = 0;
  const post = hit && tc !== null ? Math.max(0, st - tc) : 0;
  if (hit && tc !== null) {
    if (st < tc) {
      const w = smooth((st - (tc - 0.07)) / 0.07);
      bx = lerp(free.x, XC, w);
      by = lerp(free.y, YC, w);
    } else {
      const speed = res!.out.kind === 'perfect' ? 560 : 470;
      bx = XC - speed * post;
      by = YC - 60 * post + 170 * post * post;
      rot = -post * 1400;
      trail = clamp01(1 - post / 0.4);
    }
  }
  const height = clamp01((GROUND - by) / 150);

  /* ───── cues and results ───── */
  const near = playing && !res ? Math.abs(st - SWING - p.tIdeal) : 9;
  const ready = near <= p.good * 0.9 && playing && !res;
  const wasReady = useRef(false);
  useEffect(() => {
    if (ready && !wasReady.current) haptic(8);
    wasReady.current = ready;
  }, [ready]);
  const kind = res?.out.kind;
  const sinceHit = tc !== null ? st - tc : -1;
  const verdictOn = res ? (hit ? sinceHit > 0.12 : st > tc! + 0.25) : playing && clock > p.tIdeal + 0.4;
  const verdict = (() => {
    switch (kind) {
      case 'perfect':
        return { big: t('WHAT A STRIKE!'), sub: t('Right into the top corner.'), tone: 'text-gold-300' };
      case 'good':
        return { big: t('ON TARGET'), sub: t('Low into the corner, the keeper is beaten.'), tone: 'text-neon-300' };
      case 'early':
        return { big: t('TOO EARLY'), sub: t('You swung before it dropped.'), tone: 'text-crimson-300' };
      case 'late':
        return { big: t('TOO LATE'), sub: t('It had already bounced past your boot.'), tone: 'text-crimson-300' };
      default:
        return { big: t('TOO LATE'), sub: t('You never got your boot to it.'), tone: 'text-crimson-300' };
    }
  })();

  // a push-in on the contact
  const bump = hit && tc !== null ? Math.sin(Math.PI * clamp01((st - (tc - 0.15)) / 0.9)) : 0;
  const zoom = 1 + 0.2 * bump;
  const zx = XC;
  const zy = GROUND - 30;
  const shake = hit && post < 0.2 ? Math.sin(post * 160) * 3 * (0.2 - post) * 5 : 0;
  const goalP = hit ? clamp01((post - 0.15) / 0.75) : 0;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ transform: `translateX(${shake}px)` }}>
          <g transform={`translate(${zx * (1 - zoom)} ${zy * (1 - zoom)}) scale(${zoom})`}>
            <PitchSide w={W} h={H} />
            {/* the spot where the boot will meet the ball */}
            {playing && !res && st > p.tIdeal - 0.8 && (
              <g transform={`translate(${XC} ${YC})`}>
                <circle r={ready ? 15 : 13} fill={ready ? '#bbf7d0' : 'none'} fillOpacity=".12" stroke={ready ? '#86efac' : '#fff'} strokeWidth={ready ? 2 : 1.2} opacity={ready ? 0.95 : 0.35}>
                  {ready && <animate attributeName="r" values="13;17;13" dur=".45s" repeatCount="indefinite" />}
                </circle>
              </g>
            )}
            {/* where the ball is going to land */}
            <ellipse cx={bx} cy={GROUND + 5} rx={9 - height * 4} ry={2.4 - height * 0.8} fill="#000" opacity={0.3 - height * 0.12} />
            {trail > 0 &&
              Array.from({ length: 5 }, (_, i) => (
                <circle key={i} cx={bx + (i + 1) * 12} cy={by + (i + 1) * 1.5} r={BALL_R * (1 - i * 0.16)} fill="#fff" opacity={0.28 * trail * (1 - i * 0.2)} />
              ))}
            <Striker x={PLX} y={GROUND} s={S} kit={kit} skin={skin} hair={hair} k={k} lean={lean} arm={arm} />
            <g transform={`translate(${bx} ${by}) rotate(${rot})`}>
              <circle r={BALL_R} fill="#fafafa" stroke="#18181b" strokeWidth=".9" />
              <polygon points={`0,${-BALL_R * 0.5} ${BALL_R * 0.48},${-BALL_R * 0.15} ${BALL_R * 0.3},${BALL_R * 0.4} ${-BALL_R * 0.3},${BALL_R * 0.4} ${-BALL_R * 0.48},${-BALL_R * 0.15}`} fill="#18181b" />
              <path d={`M0 ${-BALL_R * 0.5}L0 ${-BALL_R}M${BALL_R * 0.48} ${-BALL_R * 0.15}L${BALL_R} ${-BALL_R * 0.3}M${-BALL_R * 0.48} ${-BALL_R * 0.15}L${-BALL_R} ${-BALL_R * 0.3}`} stroke="#18181b" strokeWidth=".7" />
            </g>
            {/* turf thrown up and a flash at the boot */}
            {hit && post < 0.45 && (
              <g transform={`translate(${XC} ${YC})`} opacity={1 - post / 0.45}>
                <circle r={4 + post * 60} fill="none" stroke={res!.out.kind === 'perfect' ? '#fde68a' : '#bbf7d0'} strokeWidth="2.400" />
                {Array.from({ length: 7 }, (_, i) => {
                  const a = (i / 7) * Math.PI * 2;
                  return <line key={i} x1={Math.cos(a) * (9 + post * 40)} y1={Math.sin(a) * (9 + post * 40)} x2={Math.cos(a) * (16 + post * 70)} y2={Math.sin(a) * (16 + post * 70)} stroke="#fff" strokeWidth="1.500" strokeLinecap="round" />;
                })}
              </g>
            )}
          </g>
          {/* the goal, from behind the striker */}
          {hit && goalP > 0 && (
            <g transform="translate(8 8)" opacity={clamp01(goalP * 5)}>
              <GoalCam p={goalP} quality={res!.out.kind === 'perfect' ? 'perfect' : 'good'} kit={kit} />
            </g>
          )}
        </svg>

        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 px-4 text-center text-[11px] font-semibold text-white/80">{t('Swing as the ball drops into your boot.')}</div>}
        {hit && post > 0 && post < 0.12 && <div className="pointer-events-none absolute inset-0 bg-white/20" />}

        <AnimatePresence>
          {verdictOn && (
            <motion.div initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className={cn('pointer-events-none absolute right-0 top-3 text-center', hit ? 'w-[62%]' : 'inset-x-0')}>
              <div className={cn('font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]', verdict.tone)}>{verdict.big}</div>
              <div className="px-2 text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{verdict.sub}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ActionButton onPress={flow.stage === 'idle' ? flow.start : strike} disabled={locked || flow.stage === 'count' || !!res} label={flow.stage === 'idle' ? t('START') : t('STRIKE!')} icon={<Zap className="h-5 w-5" />} />
    </div>
  );
}
