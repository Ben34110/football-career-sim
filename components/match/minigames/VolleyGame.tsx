'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { ActionButton, Ball, CountOverlay, Footballer, PitchSide, useClock, useStartFlow, type SceneProps } from './shared';

const GROUND = 160;
const LINE = 112; // the gold strike line (y)

/** Volley: the ball drops from the night sky, bounces once, and you hit it on the gold line. */
export function VolleyGame({ bonus, pressure, difficulty, locked, kit, skin, hair, onStop }: SceneProps) {
  const t = useT();
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref } = useClock(playing);
  // the ball is at the line on the way up after the bounce, at tHit seconds
  const fall = useMemo(() => 0.95 - difficulty * 0.12 - pressure * 0.06 + Math.random() * 0.12, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bounce = 0.55;
  const [strike, setStrike] = useState<{ at: number; err: number } | null>(null);
  const done = useRef(false);
  const perfect = 0.055 + bonus * 0.4;
  const good = 0.13 + bonus * 0.6;

  // ball height (y): falls from 10 to the ground in `fall`, bounces back up to the line height and beyond
  const ballY = (s: number) => {
    if (s < fall) return 10 + (GROUND - 8 - 10) * (s / fall) ** 2;
    const u = s - fall;
    return GROUND - 8 - 78 * Math.sin(Math.min(1, u / bounce) * Math.PI) * (u < bounce ? 1 : 0);
  };
  // the sweet moment: the ball is rising and crosses the line
  const tLine = useMemo(() => {
    let best = fall;
    for (let s = fall; s < fall + bounce / 2; s += 0.002) if (Math.abs(ballY(s) - LINE) < Math.abs(ballY(best) - LINE)) best = s;
    return best;
  }, [fall]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => {
    if (!playing || strike || locked) return;
    const at = ref.current;
    setStrike({ at, err: at - tLine });
    haptic(20);
  };
  useEffect(() => {
    if (!strike || done.current) return;
    done.current = true;
    const e = Math.abs(strike.err);
    const id = setTimeout(() => onStop(e <= perfect ? 'perfect' : e <= good ? 'good' : 'miss'), 900);
    return () => clearTimeout(id);
  }, [strike]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playing && !strike && clock > fall + bounce + 0.3 && !done.current) {
      done.current = true;
      onStop('miss');
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = strike ? strike.at : clock;
  const post = strike ? Math.max(0, clock - strike.at) : 0;
  let bx = 210;
  let by = playing ? ballY(Math.min(s, fall + bounce)) : 10;
  let rot = clock * 200;
  if (strike) {
    const e = strike.err;
    const quality = Math.abs(e) <= perfect ? 'perfect' : Math.abs(e) <= good ? 'good' : 'miss';
    // the shot flies to the goal on the left: top corner, on target, or skied
    const tx = 40;
    const ty = quality === 'perfect' ? 66 : quality === 'good' ? 100 : 6;
    const p = Math.min(1, post / 0.7);
    bx = 210 + (tx - 210) * p;
    by = by + (ty - by) * p - Math.sin(p * Math.PI) * 10;
    rot = post * 900;
  }
  const glow = bonus > 0.03 && playing && !strike && Math.abs(s - tLine) < good;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox="0 0 340 190" className="block w-full">
          <PitchSide horizon={112} />
          {/* the goal, far left */}
          <g>
            <rect x="8" y="76" width="44" height="40" fill="none" stroke="#fff" strokeWidth="2" opacity=".85" />
            <path d="M8 76L52 116M52 76L8 116" stroke="#fff" strokeWidth=".4" opacity=".25" />
            <rect x="26" y="96" width="9" height="20" rx="3" fill="#f59e0b" opacity=".9" transform={strike && Math.abs(strike.err) <= good ? 'translate(-6 4) rotate(-12 30 106)' : ''} />
          </g>
          <line x1="150" y1={LINE} x2="290" y2={LINE} stroke="#fbbf24" strokeWidth="1.600" strokeDasharray="5 4" opacity=".9" />
          <Footballer x={196} y={GROUND} kit={kit} skin={skin} hair={hair} pose={strike ? 'jump' : 'stand'} flip scale={1.4} />
          {glow && <circle cx={bx} cy={by} r="12" fill="none" stroke="#86efac" strokeWidth="1.600" />}
          <Ball x={bx} y={by} r={8} rot={rot} />
          {strike && post > 0.4 && (
            <text x="170" y="48" textAnchor="middle" fontSize="20" fontWeight="800" fill={Math.abs(strike.err) <= perfect ? '#fde68a' : Math.abs(strike.err) <= good ? '#86efac' : '#fca5a5'}>
              {Math.abs(strike.err) <= perfect ? t('WHAT A STRIKE!') : Math.abs(strike.err) <= good ? t('ON TARGET') : strike.err < 0 ? t('TOO EARLY') : t('TOO LATE')}
            </text>
          )}
        </svg>
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
      </div>
      <ActionButton onPress={flow.stage === 'idle' ? flow.start : tap} disabled={locked || flow.stage === 'count' || !!strike} label={flow.stage === 'idle' ? t('START') : t('STRIKE!')} />
    </div>
  );
}
