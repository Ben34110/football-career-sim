'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FIELD,
  FLIGHT,
  GOAL_HALF,
  PRE,
  RT,
  ROUNDS,
  ballAt,
  defAt,
  judge,
  makeRebound,
  rollAt,
  rollSpeed,
  stepRunner,
  type ReboundVerdict,
  type Runner,
  type V,
} from '@/lib/engine/minigames/rebound';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CountOverlay, shade, useStartFlow, type SceneProps } from './shared';

/* The six-yard box seen from above, the goal at the top. 20 px to the metre. */
const W = 340;
const H = 304;
const PPM = 20;
const CX = 170;
const GY = 44;
const px = (x: number) => CX + x * PPM;
const py = (y: number) => GY + y * PPM;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** Degrees clockwise from "up the screen" for a direction on the pitch */
const angleOf = (dx: number, dy: number) => (Math.atan2(dx, -dy) * 180) / Math.PI;
/** Eases an angle towards another along the short way round */
const turn = (from: number, to: number, k: number) => {
  let d = ((to - from + 540) % 360) - 180;
  if (Math.abs(d) < 0.01) d = 0;
  return from + d * k;
};

const SKINS = ['#c68642', '#8d5524', '#e0ac69', '#f1c27d'];

/* ───────────────────────── a player seen from above ───────────────────────── */

function Man({
  p,
  face,
  kit,
  skin,
  hair,
  stride = 0,
  kick = 0,
  arms = 'swing',
  gloves,
  scale = 1.15,
}: {
  p: V;
  face: number;
  kit: string;
  skin: string;
  hair: string;
  /** Running phase */
  stride?: number;
  /** −1 winding up … 1 swinging through */
  kick?: number;
  arms?: 'swing' | 'up' | 'reach';
  gloves?: string;
  scale?: number;
}) {
  const dark = shade(kit, -0.4);
  const sw = Math.sin(stride);
  const kickR = Math.max(0, kick);
  const windR = Math.max(0, -kick);
  const legR = 3.2 - sw * 3 - kickR * 6 + windR * 3.5;
  const legL = 3.2 + sw * 3;
  const swing = arms === 'swing' ? sw * 2.6 : 0;
  const hand = (side: 1 | -1): [number, number] => (arms === 'up' ? [side * 7.2, -4.6] : arms === 'reach' ? [side * 2.8, -9.4] : [side * 6.6, 1.6 + side * swing]);
  const shoulder = (side: 1 | -1): [number, number] => [side * 4.8, -0.4];
  return (
    <g transform={`translate(${px(p.x)} ${py(p.y)}) scale(${scale})`}>
      <ellipse cx="1.6" cy="2.2" rx="7.4" ry="5.8" fill="#000" opacity=".3" />
      <g transform={`rotate(${face.toFixed(1)})`}>
        {/* legs and boots */}
        <ellipse cx="-2.5" cy={legL} rx="1.9" ry="3.4" fill={dark} />
        <ellipse cx="-2.5" cy={legL + 2.6} rx="1.7" ry="1.9" fill="#0b0b0e" />
        <ellipse cx="2.5" cy={legR} rx="1.9" ry="3.4" fill={dark} />
        <ellipse cx="2.5" cy={legR + 2.6} rx="1.7" ry="1.9" fill="#0b0b0e" />
        {/* arms */}
        {([-1, 1] as const).map((s) => {
          const sh = shoulder(s);
          const h = hand(s);
          return (
            <g key={s}>
              <path d={`M${sh[0]} ${sh[1]}L${h[0]} ${h[1]}`} stroke={kit} strokeWidth="3" strokeLinecap="round" />
              <circle cx={h[0]} cy={h[1]} r="1.7" fill={gloves ?? skin} />
            </g>
          );
        })}
        {/* shoulders and shirt */}
        <ellipse cx="0" cy="0" rx="5.9" ry="3.5" fill={kit} stroke={dark} strokeWidth=".8" />
        <path d="M-3.2 0.6Q0 2 3.2 0.6" stroke={dark} strokeWidth=".7" fill="none" opacity=".6" />
        {/* the head: hair, with a hint of face at the front */}
        <circle cx="0" cy="-0.6" r="3.5" fill={hair} />
        <ellipse cx="0" cy="-2.6" rx="2.2" ry="1.3" fill={skin} />
        <circle cx="-3.4" cy="-0.6" r="0.9" fill={skin} />
        <circle cx="3.4" cy="-0.6" r="0.9" fill={skin} />
      </g>
    </g>
  );
}

/* ───────────────────────── the pitch ───────────────────────── */

function Pitch({ ripple }: { ripple: { x: number; y: number; p: number } | null }) {
  const gw = GOAL_HALF * PPM;
  return (
    <g>
      <defs>
        <linearGradient id="rb-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14562f" />
          <stop offset="1" stopColor="#0d4224" />
        </linearGradient>
        <pattern id="rb-net" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 0L5 5M5 0L0 5" stroke="#fff" strokeWidth=".45" opacity=".55" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#rb-grass)" />
      {Array.from({ length: 8 }, (_, k) => (
        <rect key={k} y={py(k * 2)} width={W} height={2 * PPM} fill="#fff" opacity={k % 2 ? 0.045 : 0} />
      ))}
      {/* behind the goal: boards and the stand */}
      <rect width={W} height={GY - 26} fill="#070d1c" />
      <g opacity=".6">
        {Array.from({ length: 38 }, (_, i) => (
          <circle key={i} cx={i * 9.2 + 3} cy={9 - ((i * 7) % 7)} r={3.3} fill={['#b45309', '#e5e7eb', '#1d4ed8', '#fbbf24', '#9ca3af'][i % 5]} opacity=".55" />
        ))}
      </g>
      <rect y={GY - 36} width={W} height="9" fill="#0b1220" />
      <rect y={GY - 28} width={W} height="2" fill="#10e08a" opacity=".5" />
      <rect y={GY - 26} width={W} height="26" fill="#0e3a21" />
      {/* the lines */}
      <path d={`M${px(-9.16)} ${GY}V${py(5.5)}H${px(9.16)}V${GY}`} fill="none" stroke="#fff" strokeWidth="1.6" opacity=".6" strokeLinejoin="round" />
      <path d={`M0 ${GY}H${W}`} stroke="#fff" strokeWidth="1.6" opacity=".6" />
      <circle cx={px(0)} cy={py(11)} r="1.6" fill="#fff" opacity=".7" />
      {/* the goal */}
      <rect x={px(-GOAL_HALF)} y={GY - 26} width={2 * gw} height="26" fill="url(#rb-net)" opacity=".75" />
      <rect x={px(-GOAL_HALF)} y={GY - 26} width={2 * gw} height="26" fill="#000" opacity=".22" />
      {ripple && ripple.p > 0 && <circle cx={ripple.x} cy={ripple.y} r={4 + ripple.p * 26} fill="none" stroke="#fff" strokeWidth="2" opacity={0.7 * (1 - ripple.p)} />}
      <path d={`M${px(-GOAL_HALF)} ${GY}V${GY - 26}H${px(GOAL_HALF)}V${GY}`} stroke="#fff" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
    </g>
  );
}

/* ───────────────────────── the game ───────────────────────── */

interface Sim {
  clock: number;
  last: number;
  round: number;
  me: Runner;
  face: number;
  target: V | null;
  down: boolean;
  /** When you played the ball in each round (local time), or null */
  touch: (number | null)[];
  verdict: (ReboundVerdict | undefined)[];
  /** Metres run, for the stride */
  run: number;
  spin: number;
}

/**
 * Poacher. A teammate shoots, the keeper parries, and the ball runs loose in the six-yard box.
 * Steer your striker with your thumb and get to it before the defender does.
 */
export function ReboundGame({ bonus, pressure, difficulty, locked, kit, oppKit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const plan = useMemo(() => makeRebound(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const svgRef = useRef<SVGSVGElement>(null);
  const done = useRef(false);

  const starts = useMemo(() => {
    const out: number[] = [];
    let acc = plan.lead;
    for (const l of plan.lens) {
      out.push(acc);
      acc += l;
    }
    return out;
  }, [plan]);
  const total = starts[ROUNDS - 1] + plan.lens[ROUNDS - 1];

  const sim = useRef<Sim>({
    clock: 0,
    last: 0,
    round: 0,
    me: { ...plan.rounds[0].me0, vx: 0, vy: 0 },
    face: 0,
    target: null,
    down: false,
    touch: Array(ROUNDS).fill(null),
    verdict: Array(ROUNDS).fill(undefined),
    run: 0,
    spin: 0,
  });
  const [, setFrame] = useState(0);
  const [shown, setShown] = useState<(ReboundVerdict | undefined)[]>([]);
  const [asked, setAsked] = useState(false);

  /* ───── the loop: the physics, then a repaint ───── */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 === null) t0 = now;
      const S = sim.current;
      const clock = (now - t0) / 1000;
      const dt = Math.min(0.05, Math.max(0, clock - S.last));
      S.last = clock;
      S.clock = clock;

      let i = 0;
      while (i < ROUNDS - 1 && clock >= starts[i + 1]) i++;
      if (i !== S.round) {
        S.round = i;
        S.me = { ...plan.rounds[i].me0, vx: 0, vy: 0 };
        S.face = 0;
        S.target = null;
      }
      const rd = plan.rounds[i];
      const lt = clock - starts[i] - PRE;

      // you run to where your thumb is, until you have played the ball
      if (S.touch[i] === null && S.verdict[i] === undefined) {
        const before = S.me;
        S.me = stepRunner(S.me, lt >= -PRE ? S.target : null, dt, plan.speed);
        const moved = Math.hypot(S.me.x - before.x, S.me.y - before.y);
        S.run += moved;
        const sp = Math.hypot(S.me.vx, S.me.vy);
        if (sp > 0.6) S.face = turn(S.face, angleOf(S.me.vx, S.me.vy), 1 - Math.exp(-dt / 0.07));
      } else {
        S.me = { ...S.me, vx: S.me.vx * 0.8, vy: S.me.vy * 0.8 };
      }

      // the ball turns as fast as it rolls
      const bt = S.touch[i];
      S.spin += (bt !== null ? 22 : lt < -FLIGHT ? 0 : lt < 0 ? 18 : lt >= rd.tDef ? 12 : rollSpeed(rd, lt)) * dt * 110;

      // did you get a boot to it before he did?
      if (S.verdict[i] === undefined && lt >= 0) {
        const b = rollAt(rd, lt);
        if (lt < rd.tDef && Math.hypot(S.me.x - b.x, S.me.y - b.y) <= RT) {
          S.touch[i] = lt;
          S.verdict[i] = judge(rd, lt);
          setShown([...S.verdict]);
          haptic([15, 20, 40]);
        } else if (lt >= rd.tDef) {
          S.verdict[i] = 'late';
          setShown([...S.verdict]);
          haptic(70);
        }
      }

      if (clock >= total && !done.current) {
        done.current = true;
        const n = S.verdict.filter((v) => v === 'perfect' || v === 'good').length;
        onStop(n >= ROUNDS ? 'perfect' : n === ROUNDS - 1 ? 'good' : 'miss');
      }
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── your thumb ───── */
  const toWorld = (e: React.PointerEvent): V | null => {
    const el = svgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    return { x: Math.max(FIELD.xMin, Math.min(FIELD.xMax, (x - CX) / PPM)), y: Math.max(FIELD.yMin, Math.min(FIELD.yMax, (y - GY) / PPM)) };
  };
  const press = (e: React.PointerEvent) => {
    if (!playing || locked) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* not every browser lets us capture */
    }
    sim.current.down = true;
    sim.current.target = toWorld(e);
    if (!asked) setAsked(true);
  };
  const drag = (e: React.PointerEvent) => {
    if (!sim.current.down || locked) return;
    sim.current.target = toWorld(e);
  };
  const release = () => {
    sim.current.down = false;
  };

  /* ───── the picture ───── */
  const S = sim.current;
  const i = S.round;
  const rd = plan.rounds[i];
  const lt = playing ? S.clock - starts[i] - PRE : -PRE;
  const clock = S.clock;
  const touch = S.touch[i];
  const verdict = S.verdict[i];
  const scored = verdict === 'perfect' || verdict === 'good';
  const since = touch !== null ? lt - touch : -1;
  const fade = playing ? smooth((lt + PRE) / 0.3) : 1;

  const ball = ballAt(rd, lt, touch);
  const ballSpeed = lt < 0 ? 0 : touch !== null || lt >= rd.tDef ? 6 : rollSpeed(rd, lt);
  const moving = playing && lt > -FLIGHT && (lt < 0 || ballSpeed > 0.4);

  // the keeper: ready, the dive to the shot, flat on the turf, then up again; or too late for yours
  const kStart: V = { x: 0, y: 0.9 };
  const kReady: V = { x: lerp(0, rd.hit.x * 0.7, smooth((lt + FLIGHT) / FLIGHT)), y: 0.9 };
  const kDive: V = { x: rd.hit.x + rd.keeperSide * 0.8, y: 1.2 };
  let keeper: V = playing ? (lt < 0 ? (lt < -FLIGHT ? kStart : kReady) : { x: lerp(kReady.x, kDive.x, smooth(lt / 0.3)), y: lerp(kReady.y, kDive.y, smooth(lt / 0.3)) }) : kStart;
  let keeperFace = 180;
  let keeperReach = false;
  if (playing && lt >= 0) {
    keeperFace = rd.keeperSide > 0 ? 95 : -95;
    keeperReach = lt < 1.3;
    if (lt > 1.3 && touch === null) {
      // he scrambles back to his feet
      const u = smooth((lt - 1.3) / 0.8);
      keeper = { x: lerp(kDive.x, 0, u), y: lerp(kDive.y, 1, u) };
      keeperFace = turn(keeperFace, 180, u);
      keeperReach = false;
    }
    if (touch !== null && since > 0.08) {
      // he is beaten: a late dive at the corner
      const u = smooth((since - 0.08) / 0.4);
      keeper = { x: lerp(kDive.x, rd.corner.x * 0.8, u), y: lerp(kDive.y, 0.9, u) };
      keeperFace = rd.corner.x > 0 ? 95 : -95;
      keeperReach = true;
    }
  }
  // the teammate who shot: winds up, strikes, then trots in behind the play
  const sPos: V = playing ? { x: lerp(rd.shooter.x, rd.shooter.x * 0.9, smooth((lt + FLIGHT) / 1.6)), y: lerp(rd.shooter.y, rd.shooter.y - 1.3, smooth((lt + FLIGHT) / 1.6)) } : rd.shooter;
  const sKick = playing ? (lt < -FLIGHT - 0.1 ? -clamp01((lt + PRE) / (PRE - FLIGHT - 0.1)) : lt < -FLIGHT + 0.1 ? 1 : 0) : 0;
  const sFace = angleOf(rd.hit.x - rd.shooter.x, rd.hit.y - rd.shooter.y);

  // the defender: sprints for the ball, then goes for the clearance, or pulls up when you beat him
  let def = defAt(rd, Math.max(0, lt));
  if (touch !== null) def = defAt(rd, Math.max(0, touch));
  const defHeading = (() => {
    const a = defAt(rd, Math.max(0, lt - 0.05));
    const b = defAt(rd, Math.max(0, lt + 0.05));
    return Math.hypot(b.x - a.x, b.y - a.y) > 0.01 ? angleOf(b.x - a.x, b.y - a.y) : angleOf(rd.hit.x - def.x, rd.hit.y - def.y);
  })();
  const chasing = playing && lt > rd.defReact && lt < rd.tDef && touch === null;
  const defStride = chasing ? lt * 13 : 0;
  const defKick = lt >= rd.tDef - 0.2 && touch === null ? (lt < rd.tDef ? -((lt - (rd.tDef - 0.2)) / 0.2) : 1 - clamp01((lt - rd.tDef) / 0.3) * 0.5) : 0;

  // you
  const sprinting = Math.hypot(S.me.vx, S.me.vy) > 0.8;
  const myStride = S.run * 2.1;
  const myFace = touch !== null ? turn(S.face, angleOf(rd.corner.x - S.me.x, rd.corner.y - S.me.y), smooth(since / 0.15)) : S.face;
  const myKick = touch !== null ? (since < 0.3 ? Math.sin((since / 0.3) * Math.PI) * 1 : 0) : 0;
  const celebrate = scored && since > 0.7;
  const meScale = celebrate ? 1.12 + Math.sin(clock * 12) * 0.04 : 1;

  // the target of your thumb
  const target = S.target && touch === null && verdict === undefined ? S.target : null;
  const showTarget = playing && target && Math.hypot(target.x - S.me.x, target.y - S.me.y) > 0.35;

  // the loose ball's path, once it has left his gloves
  const stop = rollAt(rd, 99);
  const showPath = playing && lt > 0.04 && touch === null && lt < rd.tStop && lt < rd.tDef;
  const trail = moving
    ? [1, 2, 3, 4, 5, 6].map((k) => ballAt(rd, lt - 0.028 * k, touch))
    : [];

  // when it is in, the net ripples where the ball lands
  const flightEnd = touch !== null ? Math.hypot(rd.corner.x - rollAt(rd, touch).x, rd.corner.y - rollAt(rd, touch).y) / 22 + 0.1 : 0;
  const ripple = touch !== null && since > flightEnd ? { x: px(rd.corner.x), y: py(rd.corner.y), p: clamp01((since - flightEnd) / 0.5) } : null;
  const pulse = scored && since > flightEnd && since < flightEnd + 0.18;

  const verdictText = (() => {
    switch (verdict) {
      case 'perfect':
        return { big: t('POACHED!'), sub: t('First time, before he could react.'), tone: 'text-gold-300' };
      case 'good':
        return { big: t('GOT THERE!'), sub: t('You beat him to it.'), tone: 'text-neon-300' };
      case 'late':
        return { big: t('CLEARED!'), sub: t('The defender got there first.'), tone: 'text-crimson-300' };
      default:
        return null;
    }
  })();
  const showVerdict = !!verdictText && (verdict === 'late' ? lt > rd.tDef + 0.1 : since > 0.28);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{t('Loose ball')} {Math.min(ROUNDS, i + 1)}/{ROUNDS}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: ROUNDS }, (_, k) => (
            <span key={k} className={cn('h-2.5 w-7 rounded-full transition-colors', shown[k] === undefined ? 'bg-white/15' : shown[k] === 'perfect' || shown[k] === 'good' ? 'bg-neon-400' : 'bg-crimson-500')} />
          ))}
        </div>
      </div>

      <div className="relative select-none overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none" onPointerDown={press} onPointerMove={drag} onPointerUp={release} onPointerCancel={release}>
          <Pitch ripple={ripple} />

          {/* where the ball is going to stop */}
          {showPath && (
            <g opacity={0.55 * clamp01(1 - lt / rd.tStop + 0.25)}>
              <line x1={px(ball.x)} y1={py(ball.y)} x2={px(stop.x)} y2={py(stop.y)} stroke="#fff" strokeWidth="1.4" strokeDasharray="3 5" strokeLinecap="round" />
              <circle cx={px(stop.x)} cy={py(stop.y)} r="6" fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="2 3" />
            </g>
          )}
          {showTarget && target && (
            <g>
              <line x1={px(S.me.x)} y1={py(S.me.y)} x2={px(target.x)} y2={py(target.y)} stroke="#10e08a" strokeWidth="1" strokeDasharray="2 4" opacity=".5" />
              <circle cx={px(target.x)} cy={py(target.y)} r={6 + Math.sin(clock * 9) * 1.2} fill="none" stroke="#10e08a" strokeWidth="1.6" opacity=".85" />
            </g>
          )}

          <g opacity={fade}>
            <Man p={keeper} face={keeperFace} kit="#f59e0b" skin="#e0b896" hair="#27272a" gloves="#fafafa" arms={keeperReach ? 'reach' : 'swing'} stride={playing && lt < 0 ? clock * 5 : 0} />
            <Man p={sPos} face={sFace} kit={kit} skin={SKINS[2]} hair="#1a1410" kick={sKick} stride={playing && lt > -FLIGHT + 0.1 ? clock * 7 : 0} />

            {/* him: a ring so you always know who is coming */}
            {playing && lt > 0 && touch === null && lt < rd.tDef + 0.4 && <circle cx={px(def.x)} cy={py(def.y)} r="13" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.25 + 0.2 * Math.sin(clock * 10)} />}
            <Man p={def} face={defHeading} kit={oppKit} skin={SKINS[1]} hair="#18120c" stride={defStride} kick={defKick} />

            {/* you */}
            <circle cx={px(S.me.x)} cy={py(S.me.y)} r="13" fill="none" stroke="#10e08a" strokeWidth="1.8" opacity=".9" />
            <Man p={S.me} face={myFace} kit={kit} skin={skin} hair={hair} stride={sprinting ? myStride : 0} kick={myKick} arms={celebrate ? 'up' : 'swing'} scale={meScale} />
          </g>

          {/* the ball: shadow, trail, spin */}
          {trail.map((q, k) => (
            <circle key={k} cx={px(q.x)} cy={py(q.y)} r={Math.max(1.4, 4 - k * 0.5)} fill="#fff" opacity={0.3 - k * 0.045} />
          ))}
          <ellipse cx={px(ball.x) + 1.4} cy={py(ball.y) + 1.8} rx="4.4" ry="3.2" fill="#000" opacity=".3" />
          <g transform={`translate(${px(ball.x)} ${py(ball.y)}) rotate(${S.spin.toFixed(0)})`}>
            <circle r="4.2" fill="#fafafa" stroke="#18181b" strokeWidth=".8" />
            <circle r="1.6" fill="#18181b" />
            <circle cx="2.5" cy="-1.8" r=".9" fill="#18181b" />
            <circle cx="-2.2" cy="2" r=".9" fill="#18181b" />
          </g>
          {pulse && <rect x={px(-GOAL_HALF)} y={GY - 26} width={2 * GOAL_HALF * PPM} height="26" fill="#fff" opacity=".18" />}
        </svg>

        {playing && locked === false && !asked && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
            <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white/90">{t('Drag to run — reach the ball first')}</span>
          </div>
        )}
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 px-4 text-center text-[11px] font-semibold text-white/80">{t('Steer your striker with your thumb.')}</div>}

        <AnimatePresence>
          {showVerdict && verdictText && (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className="pointer-events-none absolute inset-x-0 top-[34%] text-center">
              <div className={cn('font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]', verdictText.tone)}>{verdictText.big}</div>
              <div className="text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{verdictText.sub}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          <Zap className="h-5 w-5" /> {t('START')}
        </button>
      ) : (
        <p className="px-2 text-center text-[12px] font-semibold text-zinc-400">{t('Drag anywhere on the pitch — he runs to your finger.')}</p>
      )}
    </div>
  );
}
