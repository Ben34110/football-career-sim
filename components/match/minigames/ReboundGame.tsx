'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { CountOverlay, useClock, useStartFlow, type SceneProps } from './shared';

const ROUNDS = 3;
const SPOTS: [number, number][] = [
  [90, 70],
  [170, 56],
  [250, 70],
  [120, 118],
  [220, 118],
];

/** Poacher: the ball ricochets around the six-yard box — tap the real one before the defenders clear it. */
export function ReboundGame({ bonus, pressure, difficulty, locked, kit, oppKit, onStop }: SceneProps) {
  const t = useT();
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock } = useClock(playing);
  const life = Math.max(0.55, 1.0 - difficulty * 0.2 - pressure * 0.1 + bonus * 2);
  const gap = 0.35;
  const plan = useMemo(
    () =>
      Array.from({ length: ROUNDS }, () => {
        const ball = Math.floor(Math.random() * SPOTS.length);
        const decoys = SPOTS.map((_, i) => i).filter((i) => i !== ball).sort(() => Math.random() - 0.5).slice(0, 2);
        return { ball, decoys };
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [score, setScore] = useState<(boolean | undefined)[]>([]);
  const scoreRef = useRef<(boolean | undefined)[]>([]);
  const done = useRef(false);
  const cycle = life + gap;
  const round = Math.min(ROUNDS - 1, Math.floor(clock / cycle));
  const inRound = clock - round * cycle;
  const live = playing && inRound < life && scoreRef.current[round] === undefined && !done.current;

  const mark = (i: number, ok: boolean) => {
    scoreRef.current[i] = ok;
    setScore([...scoreRef.current]);
    haptic(ok ? [15, 20, 30] : 70);
  };
  const tap = (spot: number) => {
    if (!live || locked) return;
    mark(round, spot === plan[round].ball);
  };

  useEffect(() => {
    if (!playing || done.current) return;
    for (let i = 0; i <= round; i++) if (scoreRef.current[i] === undefined && (i < round || inRound >= life)) mark(i, false);
    if (round === ROUNDS - 1 && scoreRef.current[ROUNDS - 1] !== undefined) {
      done.current = true;
      const n = scoreRef.current.filter(Boolean).length;
      setTimeout(() => onStop(n === ROUNDS ? 'perfect' : n === ROUNDS - 1 ? 'good' : 'miss'), 500);
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox="0 0 340 190" className="block w-full touch-none select-none">
          <rect width="340" height="190" fill="#14532d" />
          <rect x="40" y="26" width="260" height="130" fill="none" stroke="#fff" strokeWidth="2" opacity=".55" />
          <rect x="130" y="8" width="80" height="18" fill="none" stroke="#fff" strokeWidth="2.600" />
          {/* bodies in the box */}
          {[[70, 100, kit], [140, 92, oppKit], [205, 100, oppKit], [270, 96, kit], [165, 140, oppKit]].map(([x, y, c], i) => (
            <g key={i} opacity=".85">
              <ellipse cx={x as number} cy={(y as number) + 14} rx="10" ry="3" fill="#000" opacity=".3" />
              <rect x={(x as number) - 6} y={(y as number) - 14} width="12" height="24" rx="5" fill={c as string} />
              <circle cx={x as number} cy={(y as number) - 20} r="6" fill={i % 2 ? '#c68642' : '#e0b896'} />
            </g>
          ))}
          {live &&
            plan[round].decoys.map((d) => (
              <g key={d} onPointerDown={(e) => { e.preventDefault(); tap(d); }}>
                <circle cx={SPOTS[d][0]} cy={SPOTS[d][1]} r="17" fill="#dc2626" opacity=".18" />
                <circle cx={SPOTS[d][0]} cy={SPOTS[d][1]} r="8" fill="#ef4444" opacity=".85" />
                <text x={SPOTS[d][0]} y={SPOTS[d][1] + 3.500} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">×</text>
              </g>
            ))}
          {live && (
            <g onPointerDown={(e) => { e.preventDefault(); tap(plan[round].ball); }}>
              <circle cx={SPOTS[plan[round].ball][0]} cy={SPOTS[plan[round].ball][1]} r="22" fill="#fbbf24" opacity=".18">
                <animate attributeName="r" values="14;26;14" dur="0.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={SPOTS[plan[round].ball][0]} cy={SPOTS[plan[round].ball][1]} r="9" fill="#fafafa" stroke="#111" strokeWidth="1.200" />
            </g>
          )}
          <g>
            {Array.from({ length: ROUNDS }, (_, i) => (
              <circle key={i} cx={150 + i * 20} cy="176" r="5" fill={score[i] === undefined ? '#52525b' : score[i] ? '#34d399' : '#ef4444'} />
            ))}
          </g>
          <text x="170" y="178" textAnchor="middle" fontSize="0" />
        </svg>
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
      </div>
      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          {t('START')}
        </button>
      ) : (
        <p className="text-center text-sm font-semibold text-zinc-400">{t('Tap the white ball — never the red marks.')}</p>
      )}
    </div>
  );
}
