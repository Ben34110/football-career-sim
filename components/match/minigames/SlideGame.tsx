'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BALL_R, ballX, bodyX, feetX, makeSlide, passTime, simulateSlide, tipX, zones, DROP, type SlideOutcome } from '@/lib/engine/minigames/slide';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { ActionButton, Ball, CountOverlay, Footballer, PitchSide, RefereeCard, useClock, useStartFlow, type SceneProps } from './shared';

const GROUND = 158;
/** The players are drawn a bit bigger than life so they read on a phone */
const S = 1.45;
const W = 340;
const H = 190;

/** Slow motion around the contact: this share of real time, over this many seconds of the scene */
const SLOW = 0.35;
const SPAN = 0.5;
const warp = (c: number, a: number) => (c <= a ? c : c <= a + SPAN / SLOW ? a + (c - a) * SLOW : a + SPAN + (c - a - SPAN / SLOW));
const unwarp = (s: number, a: number) => (s <= a ? s : s <= a + SPAN ? a + (s - a) / SLOW : a + SPAN / SLOW + (s - a - SPAN));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pop = (age: number) => (age <= 0 ? 0 : 1 + Math.sin(Math.min(1, age / 0.35) * Math.PI) * 0.18 * (age < 0.35 ? 1 : 0));

/**
 * Sliding tackle. He dribbles at you; a green zone is painted on the grass.
 * Slide while the ball is in it and you win the ball. Too soon and he skips over your leg; too late and you take the man.
 */
export function SlideGame({ bonus, pressure, difficulty, locked, kit, oppKit, skin, hair, inBox, onStop }: SceneProps) {
  const t = useT();
  const p = useMemo(() => makeSlide(pressure, difficulty, bonus), []); // eslint-disable-line react-hooks/exhaustive-deps
  const zn = useMemo(() => zones(p), [p]);
  const tPass = useMemo(() => passTime(p), [p]);
  const flow = useStartFlow(locked);
  const playing = flow.stage === 'play';
  const { t: clock, ref: clockRef } = useClock(playing);
  const [res, setRes] = useState<{ tTap: number; out: SlideOutcome } | null>(null);
  const done = useRef(false);

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
    setRes({ tTap: tt, out: simulateSlide(p, tt) });
    haptic(15);
  };

  /* ───── time: real clock → scene time (slowed down around the contact) ───── */
  const contactKind = res && (res.out.kind === 'clean' || res.out.kind === 'nick' || res.out.kind === 'late');
  const tc = res && contactKind ? res.out.t : null;
  const slowFrom = res && tc !== null ? Math.max(res.tTap, tc - 0.18) : 0;
  const st = tc !== null ? warp(clock, slowFrom) : clock;

  // the verdict arrives once the picture has played
  useEffect(() => {
    if (!res) return;
    const sceneEnd = res.out.t + (tc !== null ? 0.9 : 0.75);
    const realEnd = tc !== null ? unwarp(sceneEnd, slowFrom) : sceneEnd;
    const id = setTimeout(() => finish(res.out), Math.max(0, (realEnd - clockRef.current) * 1000));
    return () => clearTimeout(id);
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  // never slid: he is past you
  useEffect(() => {
    if (playing && !res && clock > tPass + 0.6) finish({ kind: 'miss', t: tPass });
  }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── where everything is right now ───── */
  const bx0 = ballX(p, playing ? st : 0);
  const inGood = playing && !res && bx0 >= zn.good0 && bx0 <= zn.good1;
  const inPerfect = inGood && bx0 >= zn.perfect0 && bx0 <= zn.perfect1;
  const wasIn = useRef(false);
  useEffect(() => {
    if (inGood && !wasIn.current) haptic(8);
    wasIn.current = inGood;
  }, [inGood]);

  const out = res?.out;
  const post = tc !== null ? Math.max(0, st - tc) : 0;
  const contact = tc !== null && st >= tc;
  const kind = out?.kind;
  const win = kind === 'clean' || kind === 'nick';
  const foul = kind === 'late';
  const early = kind === 'early';

  // the attacker
  const rawFeet = feetX(p, playing ? st : 0);
  const tcBall = tc !== null ? ballX(p, tc) : 0;
  const tcFeet = tc !== null ? feetX(p, tc) : 0;
  let fx = rawFeet;
  let fy = GROUND + 3;
  let aPose: 'stand' | 'run' | 'down' = playing || flow.stage === 'count' ? 'run' : 'stand';
  let aLean = 0.12;
  let stride = (playing ? st : 0) * (9 + p.v / 22);
  if (contact && win) {
    // he is robbed: he carries on a few steps, off balance
    const k = 1 - Math.exp(-post * 3.2);
    fx = tcFeet + 22 * k;
    aLean = 0.12 + 0.5 * Math.exp(-post * 3);
    stride = (tc ?? 0) * (9 + p.v / 22) + post * 7 * Math.exp(-post * 2);
    if (post > 0.7) aPose = 'stand';
  } else if (contact && foul) {
    fx = tcFeet + 18 * (1 - Math.exp(-post * 4.5));
    aPose = post > 0.04 ? 'down' : 'run';
  } else if (early && playing) {
    // he hops over the leg lying in his path
    const tip = tipX(p, res!.tTap, Math.min(st, res!.tTap + 1));
    const u = clamp01((rawFeet - (tip - 22)) / (p.xD - 4 - (tip - 22)));
    if (u > 0 && u < 1) fy = GROUND + 3 - Math.sin(u * Math.PI) * 30;
  }

  // the ball
  let bxp = bx0;
  let byp = GROUND - BALL_R + 2 - Math.abs(Math.sin(stride * 0.5)) * 3;
  let rot = bx0 * 3;
  if (early && playing && fy < GROUND + 3) byp -= GROUND + 3 - fy;
  if (contact && win) {
    const k = 1 - Math.exp(-post * (kind === 'clean' ? 2.6 : 3.2));
    bxp = tcBall - (kind === 'clean' ? 185 : 90) * k;
    const lift = kind === 'clean' ? 150 : 110;
    byp = GROUND - BALL_R + 2 - Math.max(0, lift * post - 330 * post * post);
    rot = -post * 520;
  } else if (contact && foul) {
    bxp = tcBall + 52 * (1 - Math.exp(-post * 2.6));
    rot = tcBall * 3 + post * 260;
  }

  // the defender: standing, then dropping into the slide
  const sTap = res ? Math.max(0, st - res.tTap) : 0;
  const drop = res ? clamp01(sTap / DROP) : 0;
  const bodyPos = res ? bodyX(p, res.tTap, Math.min(st, res.tTap + 3)) : p.xD;
  const SLIDE_BODY_OFFSET = 19.6 * S;

  // camera: a push-in on the contact
  const bump = tc !== null ? Math.sin(Math.PI * clamp01((st - (tc - 0.25)) / 1.2)) : 0;
  const zoom = 1 + 0.2 * bump;
  const zx = tc !== null ? Math.min(W - 60, Math.max(60, tcBall)) : W / 2;
  const zy = GROUND - 30;
  const shake = contact && post < 0.25 ? Math.sin(post * 130) * 3 * (0.25 - post) * 4 : 0;

  // what the screen announces
  const verdictAt = out ? (tc !== null ? tc + 0.1 : out.t) : Infinity;
  const showVerdict = !!out && st >= verdictAt - (tc !== null ? 0 : 0.2);
  const verdict = (() => {
    switch (kind) {
      case 'clean':
        return { big: t('PERFECT TACKLE!'), sub: t('You won the ball cleanly.'), tone: 'text-neon-300' };
      case 'nick':
        return { big: t('GOT IT!'), sub: t('Just in time — you nicked it.'), tone: 'text-neon-300' };
      case 'late':
        return { big: t('FOUL!'), sub: t('You were late — you took the man.'), tone: 'text-crimson-300' };
      case 'early':
        return { big: t('TOO EARLY'), sub: t('He hopped over your leg.'), tone: 'text-gold-300' };
      default:
        return null;
    }
  })();
  const passed = !res && playing && clock > tPass + 0.05;

  const cardAge = foul && tc !== null ? st - (tc + 0.3) : -1;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ transform: `translateX(${shake}px)` }}>
          <defs>
            <linearGradient id="sz-curtain" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#4ade80" stopOpacity=".55" />
              <stop offset="1" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="sz-curtain-r" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#f87171" stopOpacity=".4" />
              <stop offset="1" stopColor="#f87171" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform={`translate(${zx * (1 - zoom)} ${zy * (1 - zoom)}) scale(${zoom})`}>
            <PitchSide w={W} h={H} />

            {/* the tackle zone painted on the grass */}
            <g opacity={res ? 0.4 : 1}>
              {/* the light curtain over the zone */}
              <rect x={zn.good0} y={GROUND - 64} width={zn.good1 - zn.good0} height={64} fill="url(#sz-curtain)" opacity={inGood ? 1 : 0.55} />
              <rect x={zn.good1} y={GROUND - 36} width={zn.red1 - zn.good1} height={36} fill="url(#sz-curtain-r)" opacity=".55" />
              {/* the strip on the ground, in perspective */}
              <g>
                <rect x={zn.good0} y={GROUND - 1} width={zn.good1 - zn.good0} height="13" rx="2" fill="#16a34a" opacity={inGood ? 0.9 : 0.6} />
                <rect x={zn.perfect0} y={GROUND - 1} width={zn.perfect1 - zn.perfect0} height="13" rx="2" fill="#bbf7d0" opacity={inPerfect ? 1 : 0.8} />
                <rect x={zn.good1} y={GROUND - 1} width={zn.yellow1 - zn.good1} height="13" fill="#f59e0b" opacity=".85" />
                <rect x={zn.yellow1} y={GROUND - 1} width={zn.red1 - zn.yellow1} height="13" rx="2" fill="#dc2626" opacity=".85" />
              </g>
              <g fontSize="8" fontWeight="800" letterSpacing=".4" textAnchor="middle">
                <text x={(zn.good0 + zn.good1) / 2} y={GROUND + 24} fill="#86efac">
                  {t('TACKLE')}
                </text>
                <text x={zn.good0 - 4} y={GROUND + 24} fill="#a1a1aa" textAnchor="end">
                  {t('TOO EARLY')}
                </text>
                <text x={zn.good1 + 4} y={GROUND + 24} fill="#fca5a5" textAnchor="start">
                  {t('FOUL!')}
                </text>
              </g>
            </g>

            {/* the attacker, in their shirt */}
            {!res && playing && [0, 1, 2].map((i) => <line key={i} x1={fx - 24 - i * 9} x2={fx - 38 - i * 9} y1={GROUND - 30 + i * 12} y2={GROUND - 30 + i * 12} stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity={0.22 - i * 0.05} />)}
            <Footballer x={fx} y={fy} kit={oppKit} skin="#c68642" hair="#18120c" phase={stride} pose={aPose} lean={aLean} scale={S} />

            {/* the ball, and the ring that says "now" */}
            {inGood && (
              <circle cx={bx0} cy={byp} r={inPerfect ? 14 : 12} fill="none" stroke={inPerfect ? '#bbf7d0' : '#4ade80'} strokeWidth={inPerfect ? 2.4 : 1.6} opacity=".85">
                <animate attributeName="r" values={inPerfect ? '12;17;12' : '11;14;11'} dur=".5s" repeatCount="indefinite" />
              </circle>
            )}
            <Ball x={bxp} y={byp} rot={rot} r={BALL_R} />

            {/* dust thrown up by the slide */}
            {res &&
              Array.from({ length: 10 }, (_, i) => {
                const ts = res.tTap + (i / 10) * 0.32;
                const age = st - ts;
                if (age < 0 || age > 0.6) return null;
                const x0 = bodyX(p, res.tTap, ts) + 14 + (i % 3) * 5;
                return <circle key={i} cx={x0 + age * 14} cy={GROUND + 1 - age * 18 - (i % 2) * 3} r={2.5 + age * 11} fill="#d9c9a0" opacity={0.45 * (1 - age / 0.6)} />;
              })}

            {/* the defender */}
            <g opacity={1 - drop}>
              {drop < 1 && <Footballer x={p.xD} y={GROUND} kit={kit} skin={skin} hair={hair} pose="stand" flip scale={S} />}
            </g>
            {drop > 0 && (
              <g opacity={drop}>
                <Footballer x={bodyPos + SLIDE_BODY_OFFSET} y={GROUND} kit={kit} skin={skin} hair={hair} pose="slide" scale={S} />
              </g>
            )}

            {/* impact */}
            {contact && post < 0.4 && (
              <g transform={`translate(${tipX(p, res!.tTap, tc!) + 4} ${GROUND - 12})`} opacity={1 - post / 0.4}>
                <circle r={4 + post * 70} fill="none" stroke={foul ? (res && out?.kind === 'late' && out.card === 'red' ? '#f87171' : '#fde047') : '#bbf7d0'} strokeWidth="2.5" />
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  return <line key={i} x1={Math.cos(a) * (10 + post * 40)} y1={Math.sin(a) * (10 + post * 40)} x2={Math.cos(a) * (18 + post * 70)} y2={Math.sin(a) * (18 + post * 70)} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />;
                })}
              </g>
            )}
          </g>

          {/* the referee, outside the zoom */}
          {foul && cardAge > 0 && (
            <g transform={`translate(${W - 30} ${GROUND + 2}) scale(${S * pop(cardAge)}) translate(${-(W - 30)} ${-(GROUND + 2)})`}>
              <RefereeCard x={W - 30} y={GROUND + 2} card={out?.kind === 'late' ? out.card : 'yellow'} />
            </g>
          )}
        </svg>

        {flow.stage === 'count' && <CountOverlay count={flow.count} />}
        {flow.stage === 'idle' && <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-[11px] font-semibold text-white/80">{t('Slide when the ball is in the green zone.')}</div>}

        {/* verdict */}
        <AnimatePresence>
          {showVerdict && verdict && (
            <motion.div key="v" initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 20 }} className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <div className={`font-display text-3xl font-extrabold uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${verdict.tone}`}>{verdict.big}</div>
              <div className="text-[11px] font-semibold text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{verdict.sub}</div>
            </motion.div>
          )}
          {passed && (
            <motion.div key="p" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <div className="font-display text-3xl font-extrabold uppercase text-gold-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{t('TOO LATE')}</div>
              <div className="text-[11px] font-semibold text-white/85">{t('He ran straight past you.')}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {foul && cardAge > 0 && (
          <motion.div initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-none absolute inset-0" style={{ background: out?.kind === 'late' && out.card === 'red' ? 'rgba(220,38,38,0.5)' : 'rgba(250,204,21,0.35)' }} />
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold leading-tight">
        <div className="rounded-xl bg-zinc-800/80 px-1.5 py-1.5 text-zinc-300">{t('Too early: he skips past')}</div>
        <div className="rounded-xl bg-neon-500/20 px-1.5 py-1.5 text-neon-300 ring-1 ring-neon-400/40">{t('Green: you win the ball')}</div>
        <div className="rounded-xl bg-crimson-500/20 px-1.5 py-1.5 text-crimson-300">{t('Too late: foul and card')}</div>
      </div>

      <ActionButton onPress={flow.stage === 'idle' ? flow.start : slide} disabled={locked || flow.stage === 'count' || !!res} label={flow.stage === 'idle' ? t('START') : t('SLIDE!')} tone={inGood ? 'primary' : 'danger'} icon={<Swords className="h-5 w-5" />} />
    </div>
  );
}
