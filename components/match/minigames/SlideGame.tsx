'use client';

import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ballOffset, feetX, legX, makeSlide, simulateSlide, type SlideOutcome } from '@/lib/engine/minigames/slide';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { ActionButton, Ball, CountOverlay, Footballer, PitchSide, RefereeCard, useClock, useStartFlow, type SceneProps } from './shared';

const GROUND = 158;
/** The players are drawn a bit bigger than life so they read on a phone */
const S = 1.45;
const W = 340;
const H = 190;

/**
 * Sliding tackle. The attacker pushes the ball ahead of him, then reels it in again, over and over.
 * Slide while the ball is far from his feet and you win it; slide into the man and the referee reaches for his pocket.
 */
export function SlideGame({ bonus, pressure, difficulty, locked, kit, oppKit, skin, hair, inBox, onStop }: SceneProps) {
  const t = useT();
  const params = useMemo(() => makeSlide(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref: clockRef } = useClock(playing);
  const [res, setRes] = useState<{ tTap: number; out: SlideOutcome } | null>(null);
  const done = useRef(false);
  const tEnd = (params.xD + 40 - params.start) / params.speed;

  const finish = (out: SlideOutcome) => {
    if (done.current) return;
    done.current = true;
    if (out.kind === 'clean') onStop('perfect');
    else if (out.kind === 'nick') onStop('good');
    else if (out.kind === 'late') onStop('miss', { card: out.card, inBox });
    else onStop('miss');
  };

  const slide = () => {
    if (!playing || res || locked) return;
    const tt = clockRef.current;
    const out = simulateSlide(params, tt);
    setRes({ tTap: tt, out });
    haptic(15);
  };

  // the result is announced a moment after the contact, once the animation has played
  useEffect(() => {
    if (!res) return;
    const at = res.out.kind === 'miss' ? Math.max(res.out.t, res.tTap + 0.6) : res.out.t + 0.55;
    const id = setTimeout(() => finish(res.out), Math.max(0, (at - clockRef.current) * 1000));
    return () => clearTimeout(id);
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  // never slid: he is past you
  useEffect(() => {
    if (playing && !res && clock > tEnd + 0.25) finish({ kind: 'miss', t: tEnd });
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── what the scene looks like right now ───── */
  const tc = res && res.out.kind !== 'miss' ? res.out.t : null;
  const post = tc !== null ? Math.max(0, clock - tc) : 0;
  const contact = tc !== null && clock >= tc;
  const foul = res?.out.kind === 'late';
  const win = res?.out.kind === 'clean' || res?.out.kind === 'nick';
  const lastT = tc !== null ? Math.min(clock, tc) : clock;

  const fx = feetX(params, playing ? lastT : 0);
  const off = ballOffset(params, playing ? lastT : 0);
  let ballX = fx + off + 8;
  let ballY = GROUND - 8;
  let ballRot = ballX * 3;
  if (contact && win) {
    // knocked clear, back where he came from
    ballX = fx + off + 8 - 170 * post;
    ballY = GROUND - 8 - Math.max(0, 120 * post - 330 * post * post);
    ballRot = -post * 500;
  } else if (contact && foul) {
    ballX = fx + off + 8 + 70 * (1 - Math.exp(-post * 3));
  } else if (!res && playing) {
    ballY = GROUND - 8 - Math.max(0, off - 10) * 0.22;
  }
  const attackerDown = contact && (foul || res?.out.kind === 'nick') && post > 0.05;
  const stride = (playing && !contact ? clock : tc ?? 0) * 12;

  // the defender
  let defender: React.ReactNode;
  if (res) {
    const lx = legX(params, res.tTap, Math.min(clock, res.tTap + 2));
    defender = <Footballer x={lx + 19.6 * S} y={GROUND} kit={kit} skin={skin} hair={hair} pose="slide" scale={S} />;
  } else {
    defender = <Footballer x={params.xD} y={GROUND} kit={kit} skin={skin} hair={hair} pose="stand" flip scale={S} />;
  }
  const shake = contact && post < 0.22 ? (Math.sin(post * 120) * 3 * (0.22 - post)) / 0.22 : 0;
  const glow = bonus > 0.03 && playing && !res && off >= 11;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ transform: `translateX(${shake}px)` }}>
          <PitchSide w={W} h={H} />
          {/* the attacker, in their shirt */}
          <Footballer x={fx} y={GROUND} kit={oppKit} skin="#c68642" hair="#18120c" phase={stride} pose={attackerDown ? 'down' : playing || flow.stage === 'count' ? 'run' : 'stand'} scale={S} />
          {glow && <circle cx={ballX} cy={ballY} r="11" fill="none" stroke="#86efac" strokeWidth="1.600" opacity=".7" />}
          <Ball x={ballX} y={ballY} rot={ballRot} r={8} />
          {defender}
          {foul && post > 0.3 && (
            <g>
              <g transform={`translate(${W - 28} ${GROUND}) scale(${S}) translate(${-(W - 28)} ${-GROUND})`}>
                <RefereeCard x={W - 28} y={GROUND} card={res!.out.kind === 'late' ? (res!.out as { card: 'yellow' | 'red' }).card : 'yellow'} />
              </g>
              <text x={W - 28} y={GROUND - 104} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" opacity=".9">
                {t('FOUL!')}
              </text>
            </g>
          )}
          {win && post > 0.15 && (
            <text x={150} y={78} textAnchor="middle" fontSize="20" fontWeight="800" fill="#86efac" opacity={Math.min(1, post * 3)}>
              {res!.out.kind === 'clean' ? t('CLEAN!') : t('GOT IT!')}
            </text>
          )}
        </svg>
        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-semibold text-white/70">{t('He pushes the ball ahead, then reels it in. Slide while it is far from his feet.')}</div>
        )}
        {foul && post > 0.3 && (
          <motion.div initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-none absolute inset-0" style={{ background: (res!.out as { card: string }).card === 'red' ? 'rgba(220,38,38,0.5)' : 'rgba(250,204,21,0.35)' }} />
        )}
      </div>
      <ActionButton onPress={flow.stage === 'idle' ? flow.start : slide} disabled={locked || flow.stage === 'count' || !!res} label={flow.stage === 'idle' ? t('START') : t('SLIDE!')} tone="danger" icon={<Swords className="h-5 w-5" />} />
    </div>
  );
}
