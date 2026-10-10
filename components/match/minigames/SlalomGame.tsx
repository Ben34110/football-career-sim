'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { CountOverlay, useClock, useStartFlow, type SceneProps } from './shared';

const WAVES = 6;

/** Dribble run: three lanes, defenders coming down the pitch; change lane to slip past them. */
export function SlalomGame({ bonus, pressure, difficulty, locked, kit, oppKit, onStop }: SceneProps) {
  const t = useT();
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock } = useClock(playing);
  const travel = Math.max(0.7, 1.15 - difficulty * 0.2 - pressure * 0.12 + bonus * 1.5); // seconds from the top to you
  const gap = Math.max(0.55, 0.95 - difficulty * 0.15 - pressure * 0.1);
  const plan = useMemo(
    () =>
      Array.from({ length: WAVES }, (_, i) => {
        const open = Math.floor(Math.random() * 3);
        // from the second wave on, two lanes are blocked (one is left open)
        return { blocked: [0, 1, 2].filter((l) => l !== open && (i > 0 || Math.random() < 0.7)), open };
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [lane, setLane] = useState(1);
  const laneRef = useRef(1);
  const [hits, setHits] = useState(0);
  const hitsRef = useRef(0);
  const judged = useRef(-1);
  const done = useRef(false);

  const move = (d: number) => {
    if (!playing || locked) return;
    laneRef.current = Math.max(0, Math.min(2, laneRef.current + d));
    setLane(laneRef.current);
    haptic(6);
  };

  useEffect(() => {
    if (!playing || done.current) return;
    for (let i = 0; i < WAVES; i++) {
      const arrive = i * gap + travel;
      if (clock >= arrive && judged.current < i) {
        judged.current = i;
        if (plan[i].blocked.includes(laneRef.current)) {
          hitsRef.current += 1;
          setHits(hitsRef.current);
          haptic(80);
        }
        if (i === WAVES - 1) {
          done.current = true;
          setTimeout(() => onStop(hitsRef.current === 0 ? 'perfect' : hitsRef.current === 1 ? 'good' : 'miss'), 450);
        }
      }
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  const lx = (l: number) => 95 + l * 75;
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox="0 0 340 220" className="block w-full touch-none select-none">
          <rect width="340" height="220" fill="#14532d" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x="40" y={((i * 40 + (playing ? clock * 120 : 0)) % 320) - 40} width="260" height="20" fill="#fff" opacity=".05" />
          ))}
          <line x1="58" y1="0" x2="58" y2="220" stroke="#fff" strokeWidth="2" opacity=".5" />
          <line x1="282" y1="0" x2="282" y2="220" stroke="#fff" strokeWidth="2" opacity=".5" />
          {playing &&
            plan.map((w, i) => {
              const p = (clock - i * gap) / travel; // 0 at the top … 1 at your lane
              if (p < 0 || p > 1.25) return null;
              const y = -20 + p * 170;
              return w.blocked.map((l) => (
                <g key={`${i}-${l}`} transform={`translate(${lx(l)} ${y})`} opacity={p > 1.1 ? 0 : 1}>
                  <ellipse cx="0" cy="14" rx="14" ry="4" fill="#000" opacity=".3" />
                  <rect x="-9" y="-14" width="18" height="26" rx="7" fill={oppKit} />
                  <circle cx="0" cy="-20" r="7" fill="#c68642" />
                  <path d="M-9 -6L-18 4M9 -6L18 4" stroke="#c68642" strokeWidth="4" strokeLinecap="round" />
                </g>
              ));
            })}
          {/* you, with the ball at your feet */}
          <g transform={`translate(${lx(lane)} 178)`} style={{ transition: 'transform .12s ease-out' }}>
            <ellipse cx="0" cy="16" rx="14" ry="4" fill="#000" opacity=".3" />
            <rect x="-9" y="-14" width="18" height="26" rx="7" fill={kit} />
            <circle cx="0" cy="-20" r="7" fill="#e0b896" />
            <circle cx="0" cy="-34" r="6" fill="#fafafa" stroke="#111" />
          </g>
          <g>
            {Array.from({ length: 2 }, (_, i) => (
              <circle key={i} cx={150 + i * 40} cy="208" r="5" fill={hits > i ? '#ef4444' : '#52525b'} />
            ))}
          </g>
        </svg>
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
      </div>
      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          {t('START')}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {([-1, 1] as const).map((d) => (
            <button key={d} onPointerDown={(e) => { e.preventDefault(); move(d); }} disabled={!playing || locked} className="h-20 touch-none select-none rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-4xl font-extrabold text-zinc-950 shadow-neon active:scale-95 disabled:opacity-40">
              {d < 0 ? '◀' : '▶'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
