'use client';

import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MiniExtra, MiniQuality } from '@/lib/types';

/** What every scene-based mini-game receives. */
export interface SceneProps {
  /** Small edge from a good attribute (0…0.08) */
  bonus: number;
  /** 0…1: the stakes of the match */
  pressure: number;
  /** 0…1: the strength of the opposition */
  difficulty: number;
  locked: boolean;
  /** false until the first tap: the first frame is frozen */
  running: boolean;
  /** Your shirt, their shirt, your skin and hair */
  kit: string;
  oppKit: string;
  skin: string;
  hair: string;
  /** A foul in the box can cost a penalty */
  inBox: boolean;
  onStop: (q: MiniQuality, extra?: MiniExtra) => void;
}

/** Seconds since `active` became true, updated every frame. `ref` always holds the latest value (for taps). */
export function useClock(active: boolean): { t: number; ref: React.MutableRefObject<number> } {
  const [t, setT] = useState(0);
  const ref = useRef(0);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = (now: number) => {
      if (t0.current === null) t0.current = now;
      ref.current = (now - t0.current) / 1000;
      setT(ref.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return { t, ref };
}

/** idle → 3 · 2 · 1 → play: the first tap only starts the countdown, so nothing happens before you are ready. */
export function useStartFlow(locked: boolean) {
  const [stage, setStage] = useState<'idle' | 'count' | 'play'>('idle');
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (stage !== 'count' || locked) return;
    if (count <= 0) {
      setStage('play');
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 650);
    return () => clearTimeout(id);
  }, [stage, count, locked]);
  const start = () => {
    if (stage !== 'idle') return;
    setCount(3);
    setStage('count');
  };
  return { stage, count, start };
}

/** The big action button of the mini-games. */
export function ActionButton({ onPress, label, disabled, tone = 'primary', icon }: { onPress: () => void; label: string; disabled?: boolean; tone?: 'primary' | 'danger'; icon?: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onPress();
      }}
      disabled={disabled}
      className={cn(
        'flex h-16 w-full touch-none select-none items-center justify-center gap-2 rounded-2xl font-display text-2xl font-extrabold uppercase tracking-wide shadow-lg transition-opacity disabled:opacity-40',
        tone === 'danger' ? 'bg-gradient-to-b from-crimson-400 to-crimson-600 text-white shadow-crimson' : 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon',
      )}
    >
      {icon ?? <Gauge className="h-5 w-5" />} {label}
    </motion.button>
  );
}

/** A 3 · 2 · 1 over the scene. */
export function CountOverlay({ count }: { count: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
      <motion.span key={count} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-8xl font-extrabold text-gold-300 drop-shadow-[0_0_18px_rgba(0,0,0,0.8)]">
        {count > 0 ? count : '•'}
      </motion.span>
    </div>
  );
}

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};
export { shade };

/**
 * A small side-view footballer, drawn around his feet (0, 0), facing right.
 * `phase` drives the running legs; `pose` picks standing, running, sliding or lying.
 */
export function Footballer({ x, y, kit, skin, hair, phase = 0, pose = 'run', flip = false, scale = 1, shorts = '#f4f4f5', lean = 0.12 }: { x: number; y: number; kit: string; skin: string; hair: string; phase?: number; pose?: 'stand' | 'run' | 'slide' | 'down' | 'jump'; flip?: boolean; scale?: number; shorts?: string; lean?: number }) {
  const sx = (flip ? -1 : 1) * scale;
  const dark = shade(kit, -0.35);
  const leg = (th: number, color: string) => {
    const hip: [number, number] = [0, -21];
    const knee: [number, number] = [hip[0] + Math.sin(th) * 11, hip[1] + Math.cos(th) * 11];
    const foot: [number, number] = [knee[0] + Math.sin(th - Math.max(0, -Math.sin(th)) * 0.9 - 0.1) * 11, knee[1] + Math.cos(th - Math.max(0, -Math.sin(th)) * 0.9 - 0.1) * 11];
    return (
      <g stroke={color} strokeWidth="4.2" strokeLinecap="round" fill="none">
        <path d={`M${hip[0]} ${hip[1]}L${knee[0].toFixed(1)} ${knee[1].toFixed(1)}L${foot[0].toFixed(1)} ${foot[1].toFixed(1)}`} />
        <circle cx={foot[0]} cy={foot[1] + 0.5} r="2.6" fill="#111827" stroke="none" />
      </g>
    );
  };

  if (pose === 'slide' || pose === 'down') {
    // lying: legs stretched to the left (towards the ball), body and head trailing to the right
    return (
      <g transform={`translate(${x} ${y}) scale(${sx} ${scale})`}>
        <ellipse cx="6" cy="1" rx="26" ry="3" fill="#000" opacity=".25" />
        <g stroke={skin} strokeWidth="4.2" strokeLinecap="round">
          <path d="M2 -7L-16 -4" />
          <path d="M2 -9L-15 -9" />
        </g>
        <circle cx="-17" cy="-4" r="2.6" fill="#111827" />
        <circle cx="-16" cy="-9.5" r="2.6" fill="#111827" />
        <rect x="-4" y="-14" width="10" height="9" rx="3" fill={shorts} />
        <rect x="4" y="-16" width="22" height="11" rx="5" fill={kit} stroke={dark} strokeWidth=".8" />
        <circle cx="31" cy="-11" r="6.2" fill={skin} />
        <path d="M25.500 -13C27 -18 34 -18 36.500 -13C34 -15 28 -15 25.500 -13Z" fill={hair} />
        <path d="M14 -8L8 -1" stroke={skin} strokeWidth="3.4" strokeLinecap="round" />
      </g>
    );
  }

  const run = pose === 'run';
  const th = run ? Math.sin(phase) * 0.95 : 0.05;
  const th2 = run ? Math.sin(phase + Math.PI) * 0.95 : -0.05;
  const arm = run ? Math.sin(phase + Math.PI) * 0.9 : 0.1;
  const jump = pose === 'jump';
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${scale})`}>
      <ellipse cx="0" cy="1" rx="12" ry="2.6" fill="#000" opacity=".25" />
      {leg(th2, shade(skin, -0.12))}
      <g transform={`rotate(${lean * 57} 0 -21)`}>
        {/* far arm */}
        <path d={`M-1 -36L${(Math.sin(-arm) * 9).toFixed(1)} ${(-36 + Math.cos(arm) * 11).toFixed(1)}`} stroke={shade(skin, -0.12)} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="-6.500" y="-23" width="13" height="7" rx="2.500" fill={shorts} />
        <rect x="-6.500" y="-39" width="13" height="18" rx="4.500" fill={kit} stroke={dark} strokeWidth=".8" />
        <path d="M-6.500 -34H6.500" stroke={dark} strokeWidth=".6" opacity=".45" />
        {/* near arm */}
        <path d={`M1 -36L${(Math.sin(arm) * 9).toFixed(1)} ${(-36 + Math.cos(arm) * 11).toFixed(1)}`} stroke={skin} strokeWidth="3.6" strokeLinecap="round" />
        <circle cx="1" cy="-46" r="6.400" fill={skin} />
        <path d="M-5.200 -47C-4 -53 5 -53 6.500 -46C4 -49 -3 -49 -5.200 -47Z" fill={hair} />
      </g>
      {leg(th, skin)}
      {jump && <path d="M-8 2Q0 6 8 2" stroke="#fff" strokeWidth=".8" fill="none" opacity=".4" />}
    </g>
  );
}

/** The ball: white with a few dark patches, spinning with `rot`. */
export function Ball({ x, y, r = 6, rot = 0 }: { x: number; y: number; r?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse cx="0" cy={r + 1} rx={r * 0.9} ry={r * 0.28} fill="#000" opacity=".25" transform={`rotate(${-rot})`} />
      <circle r={r} fill="#fafafa" stroke="#18181b" strokeWidth=".9" />
      <polygon points={`0,${-r * 0.5} ${r * 0.48},${-r * 0.15} ${r * 0.3},${r * 0.4} ${-r * 0.3},${r * 0.4} ${-r * 0.48},${-r * 0.15}`} fill="#18181b" />
      <path d={`M0 ${-r * 0.5}L0 ${-r}M${r * 0.48} ${-r * 0.15}L${r}  ${-r * 0.3}M${-r * 0.48} ${-r * 0.15}L${-r} ${-r * 0.3}`} stroke="#18181b" strokeWidth=".7" />
    </g>
  );
}

/** Night-match grass with mown stripes and a white line: the backdrop of the side-view scenes. */
export function PitchSide({ w = 340, h = 190, horizon = 112 }: { w?: number; h?: number; horizon?: number }) {
  return (
    <g>
      <defs>
        <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050b1d" />
          <stop offset="1" stopColor="#173a6b" />
        </linearGradient>
        <linearGradient id="ps-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b6b3a" />
          <stop offset="1" stopColor="#0c3d22" />
        </linearGradient>
      </defs>
      <rect width={w} height={horizon} fill="url(#ps-sky)" />
      {/* the stand, out of focus */}
      <g opacity=".5">
        {Array.from({ length: 34 }, (_, i) => (
          <circle key={i} cx={i * 10.5 + 4} cy={horizon - 12 - ((i * 7) % 9)} r={4.200} fill={['#b45309', '#e5e7eb', '#1d4ed8', '#fbbf24', '#9ca3af'][i % 5]} opacity=".5" />
        ))}
      </g>
      <rect y={horizon - 10} width={w} height="3" fill="#0b1220" opacity=".7" />
      <rect y={horizon} width={w} height={h - horizon} fill="url(#ps-grass)" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={i * 44 - 10} y={horizon} width="22" height={h - horizon} fill="#fff" opacity=".035" transform={`skewX(-18)`} />
      ))}
      <line x1="0" y1={horizon + 6} x2={w} y2={horizon + 6} stroke="#fff" strokeWidth="1.400" opacity=".45" />
    </g>
  );
}

/** The referee raising a card: shown on a foul. */
export function RefereeCard({ card, x, y }: { card: 'yellow' | 'red'; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="1" rx="12" ry="2.600" fill="#000" opacity=".25" />
      <rect x="-6.500" y="-23" width="13" height="7" rx="2.500" fill="#111827" />
      <rect x="-6.500" y="-39" width="13" height="18" rx="4.500" fill="#18181b" stroke="#000" strokeWidth=".8" />
      <circle cx="0" cy="-46" r="6.400" fill="#e0b896" />
      <path d="M-5.500 -47C-4 -53 5 -53 6.500 -46C4 -49 -3 -49 -5.500 -47Z" fill="#27272a" />
      <path d="M-5 -21L-5 -3M5 -21L5 -3" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      <path d="M3 -35L9 -52" stroke="#e0b896" strokeWidth="3.400" strokeLinecap="round" />
      <rect x="4.500" y="-67" width="9" height="13" rx="1.200" fill={card === 'red' ? '#dc2626' : '#facc15'} stroke="#000" strokeWidth=".6" transform="rotate(14 9 -60)" />
    </g>
  );
}
