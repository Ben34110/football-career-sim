'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { zoneScale } from '@/lib/engine/minigames/difficulty';
import { BAR, CHARGE, G, makeLob, previewPath, simulateLob, smotherAt, keeperX, lobQuality, type LobResult } from '@/lib/engine/minigames/lob';
import { CONTACT_K } from '@/lib/engine/minigames/volley';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CountOverlay, PitchSide, useClock, useStartFlow, type SceneProps } from './shared';
import { Striker } from './VolleyGame';

const W = 340;
const H = 190;
const GROUND = 158;
/** metres → pixels: along the pitch, and up in the air (a little stretched so a lob is readable) */
const X = (m: number) => 74 + m * 9.125;
const Y = (h: number) => GROUND - h * 28;
const STRIKER_X = 46;
/** The flight plays faster than real time */
const SPEED = 1.7;
/** Seconds between the release and the boot meeting the ball */
const KICK = 0.12;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/** The keeper, side-on, facing the striker: he leans into his run and throws his arms up when he jumps. */
function SideKeeper({ x, lean, jump, kit }: { x: number; lean: number; jump: number; kit: string }) {
  const lift = jump * 12;
  return (
    <g transform={`translate(${x} ${GROUND - lift}) scale(-1.15 1.15)`}>
      <ellipse cx="0" cy={1 + lift / 1.15} rx="13" ry="2.8" fill="#000" opacity=".28" />
      <g transform={`rotate(${lean * 57.3} 0 -21)`}>
        <path d="M-2 -21L-5 -11L-8 -1" stroke="#e0b896" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M2 -21L5 -11L9 -1" stroke="#e0b896" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <ellipse cx="-8" cy="-.4" rx="4.6" ry="2.4" fill="#0b0b0f" />
        <ellipse cx="9" cy="-.4" rx="4.6" ry="2.4" fill="#0b0b0f" />
        <rect x="-6.5" y="-26" width="13" height="7.5" rx="2.5" fill="#27272a" />
        <rect x="-6.5" y="-41" width="13" height="18" rx="4.5" fill={kit} stroke="#00000055" strokeWidth=".8" />
        <circle cx="1.5" cy="-47" r="6.3" fill="#e0b896" />
        <path d="M-4 -49C-3.5 -55 6 -54.5 7.5 -48C5 -50.5 -1 -50.5 -4 -49Z" fill="#27272a" />
        {/* gloves: down while he waits, up when he jumps */}
        <path d={`M0 -37L${(6 + jump * 2).toFixed(1)} ${(-30 - jump * 18).toFixed(1)}`} stroke="#e0b896" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx={6 + jump * 2} cy={-30 - jump * 18} r="3.6" fill="#facc15" />
        <path d={`M0 -37L${(-6 - jump * 2).toFixed(1)} ${(-30 - jump * 16).toFixed(1)}`} stroke="#e0b896" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx={-6 - jump * 2} cy={-30 - jump * 16} r="3.6" fill="#facc15" />
      </g>
    </g>
  );
}

/**
 * The lob. The keeper comes off his line: hold to charge the chip, release to play it.
 * The dotted line shows where it would land: it has to clear his gloves and still drop under the bar.
 */
export function OneOnOneGame({ bonus, pressure, difficulty, locked, kit, skin, hair, oppKit, onStop }: SceneProps) {
  const t = useT();
  const params = useMemo(() => makeLob(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const smother = useMemo(() => smotherAt(params), [params]);
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref } = useClock(playing);
  const holdFrom = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [shot, setShot] = useState<{ at: number; power: number; res: LobResult } | null>(null);
  const done = useRef(false);

  const power = holding && holdFrom.current !== null ? clamp01((clock - holdFrom.current) / CHARGE) : 0;

  const press = () => {
    if (!playing || shot || locked || done.current) return;
    holdFrom.current = ref.current;
    setHolding(true);
    haptic(8);
  };
  const release = () => {
    if (holdFrom.current === null || shot || done.current) return;
    const now = ref.current;
    const pw = clamp01((now - holdFrom.current) / CHARGE);
    holdFrom.current = null;
    setHolding(false);
    setShot({ at: now, power: pw, res: simulateLob(params, now, pw, -bonus * 2.5 + (1 - zoneScale(difficulty, pressure)) * 0.5) });
    haptic(25);
  };

  // he is on you: whatever you were doing, the chance is gone
  useEffect(() => {
    if (!playing || done.current) return;
    if (!shot && clock >= smother - 0.04) {
      if (holdFrom.current !== null) release();
      else if (clock > smother + 0.8) {
        done.current = true;
        onStop('miss');
      }
    }
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  // the verdict once the move has played out
  useEffect(() => {
    if (!shot || done.current) return;
    done.current = true;
    const flight = (shot.res.samples.length * 0.02) / SPEED;
    const id = setTimeout(() => onStop(lobQuality(shot.res)), (KICK + flight + 1.1) * 1000);
    return () => clearTimeout(id);
  }, [shot]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── the picture ───── */
  const since = shot ? clock - shot.at : -1;
  const tp = shot ? Math.max(0, (since - KICK) * SPEED) : 0;
  const sIdx = shot ? Math.min(shot.res.samples.length - 1, Math.round(tp / 0.02)) : 0;
  const sample = shot && shot.res.samples.length ? shot.res.samples[sIdx] : null;
  const ended = !!shot && (!shot.res.samples.length || Math.round(tp / 0.02) >= shot.res.samples.length - 1);
  const kind = shot?.res.kind;

  // the keeper
  const smothering = kind === 'smothered';
  const kxNow = shot && sample ? sample.kx : keeperX(params, Math.min(clock, smother + 0.6));
  const handsH = sample ? sample.hands : 2.4;
  const jump = sample ? clamp01((handsH - 2.4) / 0.6) : 0;
  const rushing = !shot && playing && clock > params.start && keeperX(params, clock + 0.1) < keeperX(params, clock) - 0.01;
  const kLean = shot && sample ? (tp > params.react ? 0.2 : -0.12) : rushing ? -0.12 : 0;

  // the ball
  let bx = 0;
  let by = 0.3;
  let rot = 0;
  if (shot && sample && since >= KICK) {
    bx = sample.bx;
    by = sample.by;
    rot = tp * 600;
    // in the net: it settles just behind the line
    if (kind === 'goal' && sample.bx >= G) {
      bx = G + 0.9 + Math.min(0.6, (tp - sample.t) * 2);
      by = Math.max(0.5, sample.by - 0.35);
    }
    if (kind === 'saved' && ended) {
      bx = sample.kx - 0.4;
      by = sample.hands - 0.5;
    }
  } else if (smothering && since > 0) {
    bx = Math.max(0.6, keeperX(params, Math.min(clock, smother + 0.6)) - 0.3);
    by = 0.3;
  }
  const rolling = kind === 'goal' && sample && sample.by <= 0.02;

  // the striker's leg: it cocks back as you charge, then swings through
  const charged = holding ? smooth(power) : 0;
  let k = -0.1 - 0.8 * charged;
  if (shot) {
    const s = clamp01(since / KICK);
    k = since < KICK ? (-0.9 + (CONTACT_K + 0.9) * s * s) : CONTACT_K + (1 - CONTACT_K) * (1 - Math.pow(1 - clamp01((since - KICK) / 0.35), 2));
  }
  const lean = shot ? (since < KICK ? -0.25 : 0.08) : -0.25 * charged;

  // dotted preview of the chip you are charging
  const path = holding ? previewPath(power) : [];
  const inNet = kind === 'goal' && sample && sample.bx >= G;

  const verdict = (() => {
    if (!shot) return null;
    switch (kind) {
      case 'goal':
        return shot.res.rolled ? { big: t('IN!'), sub: t('It drops just short and rolls in.'), tone: 'text-neon-300' } : lobQuality(shot.res) === 'perfect' ? { big: t('OVER HIS HEAD!'), sub: t('A perfect lob.'), tone: 'text-gold-300' } : { big: t('IN!'), sub: t('It barely drops under the bar.'), tone: 'text-neon-300' };
      case 'saved':
        return { big: t('CAUGHT'), sub: t('The keeper got his gloves to it.'), tone: 'text-crimson-300' };
      case 'over':
        return { big: t('TOO MUCH'), sub: t('Over the bar.'), tone: 'text-crimson-300' };
      case 'short':
        return { big: t('TOO SHORT'), sub: t('It drops before the line and he scoops it up.'), tone: 'text-crimson-300' };
      default:
        return { big: t('SMOTHERED'), sub: t('You waited too long: he was on top of you.'), tone: 'text-crimson-300' };
    }
  })();
  const showVerdict = !!verdict && (smothering ? since > 0.35 : ended || (kind === 'goal' && !!sample && sample.bx >= G + 0.3));
  const noShot = !shot && playing && clock > smother + 0.1;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          <PitchSide w={W} h={H} horizon={112} />

          {/* the goal, side-on: a post, the bar and the net behind it */}
          <g>
            <path d={`M${X(G)} ${GROUND}V${Y(BAR)}L${X(G) + 16} ${Y(BAR) + 6}V${GROUND + 2}Z`} fill="#fff" opacity={inNet ? 0.3 : 0.12} />
            <path d={`M${X(G)} ${Y(BAR)}L${X(G) + 16} ${Y(BAR) + 6}`} stroke="#fff" strokeWidth="1.2" opacity=".6" />
            <path d={`M${X(G)} ${GROUND}V${Y(BAR)}`} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          </g>

          {/* the dotted line of the chip you are charging */}
          {path.map((q, i) => (
            <circle key={i} cx={X(q.x)} cy={Y(q.y)} r={i % 2 ? 1.1 : 1.5} fill="#fff" opacity={0.75 * (1 - i / (path.length + 6))} />
          ))}
          {holding && path.length > 0 && <circle cx={X(path[path.length - 1].x)} cy={Y(0)} r="2.6" fill="none" stroke="#fde047" strokeWidth="1.4" opacity=".9" />}

          {playing || shot ? <SideKeeper x={X(kxNow)} lean={kLean} jump={jump} kit="#f59e0b" /> : <SideKeeper x={X(G - 1)} lean={0} jump={0} kit="#f59e0b" />}
          <Striker x={STRIKER_X} y={GROUND} s={1.35} kit={kit} skin={skin} hair={hair} k={k} lean={lean} arm={k * 0.9} right />

          {/* the ball and its shadow */}
          <ellipse cx={X(bx)} cy={GROUND + 4} rx={Math.max(3, 8 - by * 0.9)} ry="2" fill="#000" opacity={rolling ? 0.35 : Math.max(0.12, 0.3 - by * 0.04)} />
          <g transform={`translate(${X(bx)} ${Y(by) - 6}) rotate(${rot})`}>
            <circle r="6.2" fill="#fafafa" stroke="#18181b" strokeWidth=".8" />
            <polygon points="0,-3 3,-.9 1.9,2.5 -1.9,2.5 -3,-.9" fill="#18181b" />
          </g>
          {holding && (
            <circle cx={X(0)} cy={Y(0.3) - 6} r="11" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray={`${(power * 69).toFixed(1)} 100`} strokeLinecap="round" transform={`rotate(-90 ${X(0)} ${Y(0.3) - 6})`} opacity=".9" />
          )}
          <circle cx="0" cy="0" r="0" fill={oppKit} />
        </svg>

        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 px-4 text-center text-[11px] font-semibold text-white/80">{t('Wait for him to come off his line, then hold to charge the lob.')}</div>}
        {playing && !shot && !holding && clock < params.start + 1.2 && <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-bold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{t('Wait for him…')}</div>}
        {noShot && <div className="pointer-events-none absolute inset-x-0 top-3 text-center font-display text-3xl font-extrabold uppercase text-crimson-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{t('SMOTHERED')}</div>}
        <AnimatePresence>
          {showVerdict && verdict && (
            <motion.div initial={{ opacity: 0, scale: 0.6, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <div className={cn('font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]', verdict.tone)}>{verdict.big}</div>
              <div className="px-3 text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{verdict.sub}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {flow.stage === 'idle' ? (
        <button onPointerDown={(e) => { e.preventDefault(); flow.start(); }} className="flex h-16 w-full touch-none items-center justify-center rounded-2xl bg-gradient-to-b from-neon-400 to-neon-600 font-display text-2xl font-extrabold uppercase text-zinc-950 shadow-neon">
          {t('START')}
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
              } catch {
                /* a synthetic or already-lifted pointer: nothing to capture */
              }
              press();
            }}
            onPointerUp={release}
            onPointerCancel={release}
            disabled={!playing || !!shot || locked}
            className={cn('relative flex h-20 w-full touch-none select-none items-center justify-center overflow-hidden rounded-2xl font-display text-2xl font-extrabold uppercase tracking-wide text-zinc-950 shadow-lg transition active:scale-[0.98] disabled:opacity-40', holding ? 'bg-gradient-to-b from-gold-300 to-gold-500 shadow-gold' : 'bg-gradient-to-b from-neon-400 to-neon-600 shadow-neon')}
          >
            <span className="absolute inset-y-0 left-0 bg-black/15" style={{ width: `${power * 100}%` }} />
            <span className="relative">{holding ? t('RELEASE!') : t('HOLD TO LOB')}</span>
          </button>
          <p className="text-center text-[11px] font-semibold text-zinc-500">{t('Let go when the dotted line drops under the bar, behind his gloves.')}</p>
        </div>
      )}
    </div>
  );
}
