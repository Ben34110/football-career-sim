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
  bounceHop,
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

/** The broadcast camera: it keeps your striker, the ball and the defender in frame, as close as it can. */
const ZMIN = 1.25;
const ZMAX = 2.2;
interface Cam {
  x: number;
  y: number;
  z: number;
}
function cameraTarget(points: V[]): Cam {
  const margin = 1.5;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const q of points) {
    x0 = Math.min(x0, q.x);
    x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, q.y);
    y1 = Math.max(y1, q.y);
  }
  const bw = x1 - x0 + 2 * margin;
  const bh = y1 - y0 + 2 * margin;
  const z = Math.max(ZMIN, Math.min(ZMAX, Math.min(W / (bw * PPM), H / (bh * PPM))));
  const vw = W / (PPM * z);
  const vh = H / (PPM * z);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  // never show much beyond the pitch: a little of the net at the top, the edge of the box at the bottom
  const lox = FIELD.xMin - 0.3 + vw / 2;
  const hix = FIELD.xMax + 0.3 - vw / 2;
  const loy = -1.7 + vh / 2;
  const hiy = FIELD.yMax + 0.9 - vh / 2;
  return { x: lox > hix ? 0 : Math.max(lox, Math.min(hix, cx)), y: loy > hiy ? (loy + hiy) / 2 : Math.max(loy, Math.min(hiy, cy)), z };
}

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
  scale = 1.3,
  number,
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
  /** The shirt number on his back */
  number?: number;
}) {
  const dark = shade(kit, -0.42);
  const light = shade(kit, 0.22);
  const shorts = shade(kit, -0.55);
  const sw = Math.sin(stride);
  const kickR = Math.max(0, kick);
  const windR = Math.max(0, -kick);
  // the feet: one forward, one back while running; the right one swings through on a strike
  const footR = -sw * 3.4 - kickR * 7.5 + windR * 4;
  const footL = sw * 3.4;
  const swing = arms === 'swing' ? sw * 3 : 0;
  const hand = (side: 1 | -1): [number, number] => (arms === 'up' ? [side * 8.6, -3.6] : arms === 'reach' ? [side * 3.4, -10.5] : [side * 7.4, 1.4 + side * swing]);
  const elbow = (side: 1 | -1): [number, number] => (arms === 'up' ? [side * 7.4, -0.6] : arms === 'reach' ? [side * 5.2, -5.4] : [side * 7, -0.6 + side * swing * 0.5]);
  const shoulder = (side: 1 | -1): [number, number] => [side * 5, -0.8];
  const leg = (side: 1 | -1, foot: number) => (
    <g key={side}>
      {/* thigh in shorts, then sock, then boot */}
      <ellipse cx={side * 2.5} cy={1.6 + foot * 0.3} rx="2.5" ry="3.1" fill={shorts} />
      <ellipse cx={side * 2.5} cy={4.4 + foot * 0.75} rx="1.7" ry="3" fill={light} />
      <ellipse cx={side * 2.5} cy={7 + foot} rx="2" ry="2.7" fill="#0b0b0e" />
      <ellipse cx={side * 2.5} cy={6.4 + foot} rx="0.8" ry="1.2" fill="#fff" opacity=".35" />
    </g>
  );
  return (
    <g transform={`translate(${px(p.x)} ${py(p.y)}) scale(${scale})`}>
      <ellipse cx="1.8" cy="2.4" rx="8.4" ry="7.4" fill="#000" opacity=".22" />
      <ellipse cx="1.4" cy="2" rx="6.4" ry="5.4" fill="#000" opacity=".16" />
      <g transform={`rotate(${face.toFixed(1)})`}>
        {/* legs: the far one first */}
        {footL <= footR ? [leg(-1, footL), leg(1, footR)] : [leg(1, footR), leg(-1, footL)]}
        {/* arms: sleeve, forearm, hand */}
        {([-1, 1] as const).map((sd) => {
          const sh = shoulder(sd);
          const el = elbow(sd);
          const h = hand(sd);
          return (
            <g key={sd} strokeLinecap="round" fill="none">
              <path d={`M${sh[0]} ${sh[1]}L${el[0]} ${el[1]}`} stroke={kit} strokeWidth="3.6" />
              <path d={`M${el[0]} ${el[1]}L${h[0]} ${h[1]}`} stroke={skin} strokeWidth="2.5" />
              <circle cx={h[0]} cy={h[1]} r={gloves ? 2.1 : 1.6} fill={gloves ?? skin} stroke="none" />
            </g>
          );
        })}
        {/* the shirt: shoulders, a lighter top, side stripes, the collar and the number */}
        <ellipse cx="0" cy="0.4" rx="6.6" ry="4.2" fill={kit} stroke={dark} strokeWidth=".8" />
        <ellipse cx="-1.4" cy="-0.6" rx="4.2" ry="2.3" fill={light} opacity=".28" />
        <path d="M-6.1 -1.3Q-6.6 0.8 -5.2 2.6M6.1 -1.3Q6.6 0.8 5.2 2.6" stroke={dark} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".55" />
        {number !== undefined && (
          <text x="0" y="2.6" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#fff" opacity=".85" fontFamily="system-ui, sans-serif">
            {number}
          </text>
        )}
        {/* the head: neck, ears, hair with a lighter crown */}
        <ellipse cx="0" cy="-2.6" rx="2.3" ry="1.5" fill={shade(skin, -0.2)} />
        <circle cx="-3.5" cy="-3.8" r="1" fill={skin} />
        <circle cx="3.5" cy="-3.8" r="1" fill={skin} />
        <ellipse cx="0" cy="-3.9" rx="3.7" ry="4" fill={hair} />
        <ellipse cx="-0.8" cy="-4.4" rx="2" ry="1.9" fill={shade(hair, 0.18)} opacity=".55" />
        <path d="M-2.8 -7Q0 -8.4 2.8 -7" stroke={skin} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".9" />
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
      <rect x="-400" y="-300" width={W + 800} height={H + 700} fill="url(#rb-grass)" />
      {Array.from({ length: 12 }, (_, k) => (
        <rect key={k} x="-400" y={py(k * 2 - 2)} width={W + 800} height={2 * PPM} fill="#fff" opacity={k % 2 ? 0.045 : 0} />
      ))}
      {/* behind the goal: boards and the stand */}
      <rect x="-400" y="-300" width={W + 800} height={GY - 26 + 300} fill="#070d1c" />
      <g opacity=".6">
        {Array.from({ length: 110 }, (_, i) => (
          <circle key={i} cx={(i - 36) * 9.2 + 3} cy={9 - ((i * 7) % 7) - (i % 3) * 7} r={3.3} fill={['#b45309', '#e5e7eb', '#1d4ed8', '#fbbf24', '#9ca3af'][i % 5]} opacity=".55" />
        ))}
      </g>
      <rect x="-400" y={GY - 36} width={W + 800} height="9" fill="#0b1220" />
      <rect x="-400" y={GY - 28} width={W + 800} height="2" fill="#10e08a" opacity=".5" />
      <rect x="-400" y={GY - 26} width={W + 800} height="26" fill="#0e3a21" />
      {/* the lines */}
      <path d={`M${px(-9.16)} ${GY}V${py(5.5)}H${px(9.16)}V${GY}`} fill="none" stroke="#fff" strokeWidth="1.6" opacity=".6" strokeLinejoin="round" />
      <path d={`M-400 ${GY}H${W + 400}`} stroke="#fff" strokeWidth="1.6" opacity=".6" />
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

/** A point of the screen (viewBox units) → a point of the pitch, through the camera. */
function screenToWorld(sx: number, sy: number, cam: Cam): V {
  const bx = (sx - W / 2) / cam.z + px(cam.x);
  const by = (sy - H / 2) / cam.z + py(cam.y);
  return { x: Math.max(FIELD.xMin, Math.min(FIELD.xMax, (bx - CX) / PPM)), y: Math.max(FIELD.yMin, Math.min(FIELD.yMax, (by - GY) / PPM)) };
}

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
  cam: Cam;
  /** Where your thumb is on the screen (viewBox units), while it is down */
  ptr: { sx: number; sy: number } | null;
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
    cam: cameraTarget([plan.rounds[0].me0, plan.rounds[0].shooter, plan.rounds[0].hit]),
    ptr: null,
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
        S.ptr = null;
        S.down = false;
        S.cam = cameraTarget([plan.rounds[i].me0, plan.rounds[i].shooter, plan.rounds[i].hit]);
      }
      const rd = plan.rounds[i];
      const lt = clock - starts[i] - PRE;

      // the target stays under your thumb even while the camera moves
      if (S.down && S.ptr) S.target = screenToWorld(S.ptr.sx, S.ptr.sy, S.cam);

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

      // the camera: on the shooter and the keeper at first, then on you, the ball and the defender
      {
        const pts: V[] = [{ x: S.me.x, y: S.me.y }, ballAt(rd, lt, S.touch[i])];
        if (lt < -0.1) pts.push(rd.shooter, rd.hit);
        if (lt > 0 && S.touch[i] === null) pts.push(defAt(rd, lt));
        if (S.touch[i] !== null) pts.push(rd.corner);
        const goal = cameraTarget(pts);
        const kp = 1 - Math.exp(-dt / 0.3);
        const kz = 1 - Math.exp(-dt / 0.45);
        S.cam = { x: S.cam.x + (goal.x - S.cam.x) * kp, y: S.cam.y + (goal.y - S.cam.y) * kp, z: S.cam.z + (goal.z - S.cam.z) * kz };
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
  const toSvg = (e: React.PointerEvent): { sx: number; sy: number } | null => {
    const el = svgRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { sx: ((e.clientX - r.left) / r.width) * W, sy: ((e.clientY - r.top) / r.height) * H };
  };
  const press = (e: React.PointerEvent) => {
    if (!playing || locked) return;
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* not every browser lets us capture */
    }
    const q = toSvg(e);
    sim.current.down = true;
    sim.current.ptr = q;
    if (q) sim.current.target = screenToWorld(q.sx, q.sy, sim.current.cam);
    if (!asked) setAsked(true);
  };
  const drag = (e: React.PointerEvent) => {
    if (!sim.current.down || locked) return;
    const q = toSvg(e);
    sim.current.ptr = q;
    if (q) sim.current.target = screenToWorld(q.sx, q.sy, sim.current.cam);
  };
  const release = () => {
    sim.current.down = false;
    sim.current.ptr = null;
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

  // the loose ball's path for the next moments, bounces included, once it has left his gloves
  const showPath = playing && lt > 0.04 && touch === null && lt < rd.tDef;
  const ahead = showPath ? [0.15, 0.3, 0.45, 0.6, 0.75].map((k) => rollAt(rd, lt + k)) : [];
  // the ball hops each time it hits an edge of the area
  const hop = playing && touch === null && lt >= 0 && lt < rd.tDef ? bounceHop(rd, lt) : 0;
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
          <g transform={`translate(${W / 2} ${H / 2}) scale(${S.cam.z.toFixed(4)}) translate(${-px(S.cam.x)} ${-py(S.cam.y)})`}>
          <Pitch ripple={ripple} />

          {/* where the ball is going next (it bends where it bounces) */}
          {showPath && ahead.length > 0 && (
            <polyline
              points={[ball, ...ahead].map((q) => `${px(q.x).toFixed(1)},${py(q.y).toFixed(1)}`).join(' ')}
              fill="none"
              stroke="#fff"
              strokeWidth="1.4"
              strokeDasharray="3 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".45"
            />
          )}
          {showTarget && target && (
            <g>
              <line x1={px(S.me.x)} y1={py(S.me.y)} x2={px(target.x)} y2={py(target.y)} stroke="#10e08a" strokeWidth="1" strokeDasharray="2 4" opacity=".5" />
              <circle cx={px(target.x)} cy={py(target.y)} r={6 + Math.sin(clock * 9) * 1.2} fill="none" stroke="#10e08a" strokeWidth="1.6" opacity=".85" />
            </g>
          )}

          <g opacity={fade}>
            <Man p={keeper} face={keeperFace} kit="#f59e0b" number={1} skin="#e0b896" hair="#27272a" gloves="#fafafa" arms={keeperReach ? 'reach' : 'swing'} stride={playing && lt < 0 ? clock * 5 : 0} />
            <Man p={sPos} face={sFace} number={8} kit={kit} skin={SKINS[2]} hair="#1a1410" kick={sKick} stride={playing && lt > -FLIGHT + 0.1 ? clock * 7 : 0} />

            {/* him: a ring so you always know who is coming */}
            {playing && lt > 0 && touch === null && lt < rd.tDef + 0.4 && <circle cx={px(def.x)} cy={py(def.y)} r="15" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.25 + 0.2 * Math.sin(clock * 10)} />}
            <Man p={def} face={defHeading} number={5} kit={oppKit} skin={SKINS[1]} hair="#18120c" stride={defStride} kick={defKick} />

            {/* you */}
            <circle cx={px(S.me.x)} cy={py(S.me.y)} r="15" fill="none" stroke="#10e08a" strokeWidth="1.8" opacity=".9" />
            <Man p={S.me} face={myFace} number={9} kit={kit} skin={skin} hair={hair} stride={sprinting ? myStride : 0} kick={myKick} arms={celebrate ? 'up' : 'swing'} scale={meScale} />
          </g>

          {/* the ball: shadow, trail, spin */}
          {trail.map((q, k) => (
            <circle key={k} cx={px(q.x)} cy={py(q.y)} r={Math.max(1.4, 4 - k * 0.5)} fill="#fff" opacity={0.3 - k * 0.045} />
          ))}
          <ellipse cx={px(ball.x) + 1.4 + hop * 2.2} cy={py(ball.y) + 1.8 + hop * 3} rx={4.4 - hop * 0.8} ry={3.2 - hop * 0.6} fill="#000" opacity={0.3 - hop * 0.1} />
          <g transform={`translate(${px(ball.x)} ${py(ball.y) - hop * 4}) scale(${(1 + hop * 0.5).toFixed(3)}) rotate(${S.spin.toFixed(0)})`}>
            <circle r="4.2" fill="#fafafa" stroke="#18181b" strokeWidth=".8" />
            <circle r="1.6" fill="#18181b" />
            <circle cx="2.5" cy="-1.8" r=".9" fill="#18181b" />
            <circle cx="-2.2" cy="2" r=".9" fill="#18181b" />
          </g>
          {pulse && <rect x={px(-GOAL_HALF)} y={GY - 26} width={2 * GOAL_HALF * PPM} height="26" fill="#fff" opacity=".18" />}
          </g>
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
