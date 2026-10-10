'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { CountOverlay, useClock, useStartFlow, type SceneProps } from './shared';

type Dir = 'L' | 'R' | 'OUT';
type Pick = 'L' | 'R' | 'CHIP';

/** One on one: wait until the keeper commits, then beat him on the other side — or chip him if he rushes out. */
export function OneOnOneGame({ bonus, pressure, difficulty, locked, oppKit, kit, onStop }: SceneProps) {
  const t = useT();
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref } = useClock(playing);
  const plan = useMemo(() => {
    const r = Math.random();
    return { at: 1.1 + Math.random() * 1.5, dir: (r < 0.38 ? 'L' : r < 0.76 ? 'R' : 'OUT') as Dir };
  }, []);
  const window1 = 0.42 + bonus * 2.2 - difficulty * 0.08;
  const window2 = 0.85 + bonus * 2 - difficulty * 0.1 - pressure * 0.05;
  const [shot, setShot] = useState<{ pick: Pick; at: number } | null>(null);
  const done = useRef(false);
  const committed = clock >= plan.at;

  const verdict = (pick: Pick, at: number): 'perfect' | 'good' | 'miss' => {
    if (at < plan.at) return 'miss'; // he read you
    const react = at - plan.at;
    const right = plan.dir === 'L' ? pick !== 'L' : plan.dir === 'R' ? pick !== 'R' : true;
    if (!right || react > window2) return 'miss';
    const best = plan.dir === 'OUT' ? pick === 'CHIP' : true;
    return best && react <= window1 ? 'perfect' : 'good';
  };

  const choose = (pick: Pick) => {
    if (!playing || shot || locked) return;
    setShot({ pick, at: ref.current });
    haptic(20);
  };
  useEffect(() => {
    if (!shot || done.current) return;
    done.current = true;
    const id = setTimeout(() => onStop(verdict(shot.pick, shot.at)), 1000);
    return () => clearTimeout(id);
  }, [shot]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playing && !shot && clock > plan.at + window2 + 0.2 && !done.current) {
      done.current = true;
      onStop('miss');
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = shot ? verdict(shot.pick, shot.at) : null;
  const post = shot ? Math.max(0, clock - shot.at) : 0;
  const sway = playing && !committed ? Math.sin(clock * 5) * 16 : 0;
  // the keeper: sways, then throws himself left, right or out
  const k = committed ? (plan.dir === 'L' ? { x: -60, rot: -70, y: 6 } : plan.dir === 'R' ? { x: 60, rot: 70, y: 6 } : { x: 0, rot: 0, y: 30 }) : { x: sway, rot: 0, y: 0 };
  const ballTo = shot ? (shot.pick === 'L' ? -64 : shot.pick === 'R' ? 64 : 0) : 0;
  const bp = Math.min(1, post / 0.5);
  const ballX = 170 + ballTo * bp;
  const ballY = shot ? 168 - (shot.pick === 'CHIP' ? 88 * Math.sin(bp * Math.PI * 0.85) + 20 * bp : 78 * bp) : 168;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox="0 0 340 190" className="block w-full">
          <rect width="340" height="190" fill="#0f3f25" />
          <rect y="0" width="340" height="60" fill="#0a1224" />
          <rect x="70" y="40" width="200" height="86" fill="none" stroke="#fff" strokeWidth="3" />
          <path d="M70 40L270 126M270 40L70 126" stroke="#fff" strokeWidth=".4" opacity=".2" />
          <g transform={`translate(${170 + k.x} ${118 + k.y}) rotate(${k.rot})`} style={{ transition: committed ? 'transform .28s ease-out' : undefined }}>
            <ellipse cx="0" cy="8" rx="16" ry="4" fill="#000" opacity=".3" />
            <rect x="-9" y="-30" width="18" height="34" rx="6" fill={oppKit} />
            <circle cx="0" cy="-38" r="8" fill="#c68642" />
            <path d="M-9 -24L-26 -38M9 -24L26 -38" stroke="#facc15" strokeWidth="5" strokeLinecap="round" />
            <path d="M-5 4L-9 22M5 4L9 22" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
          </g>
          <circle cx={ballX} cy={ballY} r={shot ? 8 - bp * 2 : 8} fill="#fafafa" stroke="#111" strokeWidth="1" />
          <ellipse cx="170" cy="182" rx="26" ry="5" fill="#fff" opacity=".12" />
          <text x="170" y="24" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" opacity=".9">
            {!playing ? '' : shot ? (q === 'perfect' ? t('GOAL!') : q === 'good' ? t('GOAL') : shot.at < plan.at ? t('HE READ YOU') : t('SAVED!')) : committed ? t('NOW!') : t('Wait for him…')}
          </text>
          {/* you, behind the ball */}
          <rect x="161" y="168" width="18" height="22" rx="6" fill={kit} opacity=".9" />
        </svg>
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
      </div>
      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          {t('START')}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {([['L', '◀'], ['CHIP', '⌒'], ['R', '▶']] as const).map(([p, label]) => (
            <button key={p} onPointerDown={(e) => { e.preventDefault(); choose(p); }} disabled={!playing || !!shot || locked} className="h-16 touch-none select-none rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-3xl font-extrabold text-zinc-950 shadow-neon active:scale-95 disabled:opacity-40">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
