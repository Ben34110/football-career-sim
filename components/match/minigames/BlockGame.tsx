'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { CountOverlay, useClock, useStartFlow, type SceneProps } from './shared';

const SHOTS = 3;
const WINDUP = 1.0;
const FLIGHT = 0.85;
const GAP = 0.5;
const CYCLE = WINDUP + FLIGHT + GAP;

/** Block the shot: the striker's body shows where he is going to shoot (mostly), and you cover a lane before the ball arrives. */
export function BlockGame({ pressure, difficulty, bonus, locked, kit, oppKit, onStop }: SceneProps) {
  const t = useT();
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock } = useClock(playing);
  const plan = useMemo(
    () =>
      Array.from({ length: SHOTS }, () => {
        const dir = Math.floor(Math.random() * 3);
        const honest = Math.random() < 0.88 - difficulty * 0.3 - pressure * 0.1 + bonus * 2;
        return { dir, hint: honest ? dir : (dir + 1 + Math.floor(Math.random() * 2)) % 3 };
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [lane, setLane] = useState(1);
  const laneRef = useRef(1);
  const [blocked, setBlocked] = useState<boolean[]>([]);
  const judged = useRef(-1);
  const done = useRef(false);

  const idx = Math.min(SHOTS - 1, Math.floor(clock / CYCLE));
  const inShot = clock - idx * CYCLE;
  const phase = inShot < WINDUP ? 'windup' : inShot < WINDUP + FLIGHT ? 'flight' : 'after';
  const shot = plan[idx];
  const arrive = idx * CYCLE + WINDUP + FLIGHT;

  const pick = (l: number) => {
    if (!playing || locked) return;
    laneRef.current = l;
    setLane(l);
    haptic(8);
  };

  useEffect(() => {
    if (!playing || done.current) return;
    for (let i = 0; i < SHOTS; i++) {
      if (clock >= i * CYCLE + WINDUP + FLIGHT && judged.current < i) {
        judged.current = i;
        const ok = laneRef.current === plan[i].dir;
        setBlocked((b) => [...b, ok]);
        haptic(ok ? [20, 20, 40] : 70);
        if (i === SHOTS - 1) {
          done.current = true;
          const n = [...blocked, ok].filter(Boolean).length;
          setTimeout(() => onStop(n === SHOTS ? 'perfect' : n === SHOTS - 1 ? 'good' : 'miss'), 450);
        }
      }
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  const x = (l: number) => 70 + l * 100;
  const ballT = phase === 'flight' ? (inShot - WINDUP) / FLIGHT : phase === 'after' ? 1 : 0;
  const bx = 170 + (x(shot.dir) - 170) * ballT;
  const by = 126 - 18 * Math.sin(ballT * Math.PI) - 0 + ballT * 22;
  const br = 3 + ballT * 8;
  const hintX = 170 + (x(shot.hint) - 170) * 0.28;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox="0 0 340 190" className="block w-full">
          <defs>
            <linearGradient id="bg-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b2a18" />
              <stop offset="1" stopColor="#1b6b3a" />
            </linearGradient>
          </defs>
          <rect width="340" height="190" fill="url(#bg-grass)" />
          {/* the goal behind you, the striker in front */}
          {[0, 1, 2].map((l) => (
            <rect key={l} x={x(l) - 46} y="96" width="92" height="70" rx="10" fill={lane === l ? '#34d399' : '#fff'} opacity={lane === l ? 0.28 : 0.06} stroke={lane === l ? '#34d399' : '#fff'} strokeOpacity=".4" />
          ))}
          {/* the striker, small and far, leaning where he is going to put it */}
          <g transform={`translate(${hintX} 62)`}>
            <ellipse cx="0" cy="22" rx="12" ry="3" fill="#000" opacity=".3" />
            <rect x="-6" y="-14" width="12" height="22" rx="5" fill={oppKit} transform={`rotate(${(shot.hint - 1) * (phase === 'windup' ? 9 : 3)})`} />
            <circle cx="0" cy="-20" r="6" fill="#c68642" />
            <path d={`M0 8L${(shot.hint - 1) * 10} 22`} stroke="#c68642" strokeWidth="4" strokeLinecap="round" />
          </g>
          {phase !== 'after' && <circle cx={phase === 'windup' ? hintX + (shot.hint - 1) * 8 : bx} cy={phase === 'windup' ? 84 : by} r={phase === 'windup' ? 3 : br} fill="#fafafa" stroke="#111" strokeWidth="1" />}
          {/* you, covering a lane */}
          <g transform={`translate(${x(lane)} 164)`}>
            <ellipse cx="0" cy="2" rx="22" ry="5" fill="#000" opacity=".3" />
            <path d="M-14 0L-9 -34H9L14 0Z" fill={kit} stroke="#00000055" />
            <circle cx="0" cy="-42" r="9" fill="#e0b896" />
            <path d="M-9 -30L-26 -44M9 -30L26 -44" stroke="#e0b896" strokeWidth="5" strokeLinecap="round" />
          </g>
          <text x="170" y="30" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" opacity=".85">
            {phase === 'windup' ? t('Read his body…') : phase === 'flight' ? t('NOW!') : blocked[idx] === undefined ? '' : blocked[idx] ? t('BLOCKED!') : t('GOAL FOR THEM')}
          </text>
          <g>
            {Array.from({ length: SHOTS }, (_, i) => (
              <circle key={i} cx={150 + i * 20} cy="14" r="5" fill={blocked[i] === undefined ? '#52525b' : blocked[i] ? '#34d399' : '#ef4444'} />
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
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((l) => (
            <button key={l} onPointerDown={(e) => { e.preventDefault(); pick(l); }} disabled={!playing || locked} className={`h-16 touch-none select-none rounded-2xl font-display text-3xl font-extrabold shadow-lg active:scale-95 disabled:opacity-40 ${lane === l ? 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950' : 'bg-white/10 text-white'}`}>
              {l === 0 ? '◀' : l === 1 ? '■' : '▶'}
            </button>
          ))}
        </div>
      )}
      <span className="hidden">{arrive}</span>
    </div>
  );
}
