'use client';

import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { Footballer, PitchSide, useClock, useStartFlow, CountOverlay, type SceneProps } from './shared';

const FINISH = 100;
const LIMIT = 7.5;

/** Sprint duel: tap LEFT and RIGHT in turn to run; the defender runs a steady race with a burst in the middle. */
export function RaceGame({ bonus, pressure, difficulty, locked, kit, oppKit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock } = useClock(playing);
  const [mine, setMine] = useState(0);
  const mineRef = useRef(0);
  const last = useRef<'L' | 'R' | null>(null);
  const [stumble, setStumble] = useState(0);
  const done = useRef(false);
  const [cruise] = useState(() => 12.2 + difficulty * 3.4 + pressure * 1.2 + Math.random() * 1.4);

  // the defender: steady, with a burst between 2 and 3.2 seconds
  const opp = Math.min(FINISH, cruise * clock + (clock > 2 ? Math.min(1.2, clock - 2) * 5 : 0));
  const lead = mine - opp;

  const tap = (side: 'L' | 'R') => {
    if (!playing || done.current || locked) return;
    const good = last.current !== side;
    last.current = side;
    const step = good ? 3.6 + bonus * 14 : 0.5;
    if (!good) setStumble((s) => s + 1);
    mineRef.current = Math.min(FINISH, mineRef.current + step);
    setMine(mineRef.current);
    haptic(good ? 6 : 14);
  };

  useEffect(() => {
    if (!playing || done.current) return;
    if (mine >= FINISH || opp >= FINISH || clock > LIMIT) {
      done.current = true;
      const diff = mineRef.current - opp;
      onStop(mineRef.current >= FINISH && diff >= 8 ? 'perfect' : mineRef.current >= FINISH || diff > -3 ? 'good' : 'miss');
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  const px = (v: number) => 20 + (v / FINISH) * 270;
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox="0 0 340 190" className="block w-full">
          <PitchSide />
          <line x1={px(FINISH) + 6} y1="116" x2={px(FINISH) + 6} y2="186" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
          <Footballer x={px(opp)} y={146} kit={oppKit} skin="#c68642" hair="#18120c" phase={clock * 14} pose={playing ? 'run' : 'stand'} scale={1.15} />
          <Footballer x={px(mine)} y={176} kit={kit} skin={skin} hair={hair} phase={clock * 14 + 1} pose={playing ? 'run' : 'stand'} scale={1.15} />
          <rect x="20" y="104" width="300" height="6" rx="3" fill="#000" opacity=".4" />
          <rect x="20" y="104" width={Math.max(0, (mine / FINISH) * 300)} height="6" rx="3" fill="#34d399" />
          <text x="318" y="102" textAnchor="end" fontSize="11" fontWeight="800" fill={lead >= 0 ? '#86efac' : '#fca5a5'}>
            {lead >= 0 ? t('AHEAD') : t('BEHIND')}
          </text>
        </svg>
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
      </div>
      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          {t('START')}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {(['L', 'R'] as const).map((s) => (
            <button key={s} onPointerDown={(e) => { e.preventDefault(); tap(s); }} disabled={!playing || locked} className="h-20 touch-none select-none rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-4xl font-extrabold text-zinc-950 shadow-neon active:scale-95 disabled:opacity-40">
              {s === 'L' ? '◀' : '▶'}
            </button>
          ))}
        </div>
      )}
      {stumble > 0 && playing && <p className="text-center text-[11px] text-zinc-500">{t('Alternate the sides — the same side twice costs you a stride.')}</p>}
    </div>
  );
}
