'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Crowd } from '@/components/match/Crowd';
import { MomentScene } from '@/components/match/MomentScene';
import { HEADLINE, PALETTE, type CelebrationEvent } from '@/lib/data/celebrations';
import { DEFAULT_LOOK, randomLook, type Look } from '@/lib/data/look';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { useUiStore } from '@/lib/ui';
import { Beams, CameraFlashes, ConfettiRain, Fireworks, Stars } from './Effects';
import { TrophyArt } from './TrophyArt';

/** The whole ceremony lasts this long; the Continue button appears at the end. */
export const CEREMONY_SECONDS = 10;

/** Trophy ceremony: a 10-second, hands-off cinematic, then a Continue button. */
export function TrophyCelebration() {
  const event = useUiStore((s) => s.celebrations[0]);
  const close = useUiStore((s) => s.closeCelebration);
  const player = useGameStore((s) => s.player);
  return <AnimatePresence mode="wait">{event && <CeremonyView key={event.id} event={event} look={player?.look ?? DEFAULT_LOOK} playerName={player?.name ?? ''} onClose={close} />}</AnimatePresence>;
}

// squad positions: x offset from the centre (px), size relative to the captain, depth (px)
const ROW_A = [
  { x: -135, s: 0.82 },
  { x: 135, s: 0.82 },
  { x: -255, s: 0.76 },
  { x: 255, s: 0.76 },
];
const ROW_B = [
  { x: -62, s: 0.66 },
  { x: 62, s: 0.66 },
  { x: -190, s: 0.6 },
  { x: 190, s: 0.6 },
];

/** One of the squad, cheering: heavy to draw, so it only renders again if its props change. */
const Teammate = memo(function Teammate({ look, kit, height, delay }: { look: Look; kit: string; height: number; delay: number }) {
  return (
    <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 0.62, repeat: Infinity, delay, ease: 'easeInOut' }}>
      <MomentScene look={look} kit={kit} pose="arms" expression="cheer" height={height} />
    </motion.div>
  );
});

export function CeremonyView({ event, look, playerName, onClose }: { event: CelebrationEvent; look: Look; playerName: string; onClose: () => void }) {
  const t = useT();
  const reduce = useReducedMotion();
  const palette = PALETTE[event.scenario];
  // 0 intro · 1 the trophy comes down · 2 lifted · 3 headline · 4 done
  const [phase, setPhase] = useState(0);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    setVh(window.innerHeight);
    const at = (s: number, f: () => void) => setTimeout(f, s * 1000);
    const ids = [
      at(1.2, () => setPhase(1)),
      at(3.4, () => {
        setPhase(2);
        haptic([50, 40, 120]);
      }),
      at(4.6, () => setPhase(3)),
      at(CEREMONY_SECONDS, () => setPhase(4)),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);

  const heroH = Math.round(Math.max(250, Math.min(vh * 0.37, 380)));
  const stageH = 112;
  // seeded, so the squad is the same on every render
  const squad = useMemo(() => {
    const r = (() => {
      let s = event.id * 7919 + 13;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    return { a: ROW_A.map(() => randomLook(r)), b: ROW_B.map(() => randomLook(r)) };
  }, [event.id]);

  const confetti = [event.kit, '#fbbf24', '#f4f4f5', '#ef4444', '#38bdf8', '#a3e635'];
  const fire = [palette.glow, '#fbbf24', '#f472b6', '#a3e635', '#fff'];
  const solo = event.solo;
  const lifted = phase >= 2;
  const trophyUnit = heroH / 170;
  const camera = reduce ? { rotateY: [-4, 4], z: [0, 30] } : { rotateY: [-14, 9], z: [0, 95], y: [0, -8] };

  return (
    <motion.div className="fixed inset-0 z-[90] overflow-hidden bg-black text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${palette.sky[0]} 0%, ${palette.sky[1]} 52%, ${palette.sky[2]} 100%)` }} />
      <Stars />
      <Beams color={palette.glow} />

      {/* the 3D stage: layers sit at different depths and the camera swings and pushes in */}
      <div className="absolute inset-0 mx-auto max-w-[430px]" style={{ perspective: 1000, perspectiveOrigin: '50% 40%' }}>
        <motion.div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }} animate={camera} transition={{ duration: CEREMONY_SECONDS + 0.4, ease: 'easeInOut' }}>
          {/* the stands */}
          <div
            className="absolute"
            style={{
              left: '-80%',
              right: '-80%',
              top: '5%',
              height: '52%',
              transform: 'translateZ(-430px)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 24%, #000 70%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, #000 24%, #000 70%, transparent 100%)',
            }}
          >
            <Crowd kit={event.kit} joy />
          </div>
          {solo && <CameraFlashes />}

          {/* the squad, back row first */}
          {!solo &&
            ROW_B.map((p, i) => (
              <div key={`b${i}`} className="absolute" style={{ left: `calc(50% + ${p.x}px)`, bottom: stageH + 34, transform: 'translate3d(-50%,0,-190px)', opacity: phase >= 0 ? 1 : 0 }}>
                <Teammate look={squad.b[i]} kit={event.kit} height={Math.round(heroH * p.s)} delay={i * 0.11} />
              </div>
            ))}
          {!solo &&
            ROW_A.map((p, i) => (
              <div key={`a${i}`} className="absolute" style={{ left: `calc(50% + ${p.x}px)`, bottom: stageH + 8, transform: 'translate3d(-50%,0,-95px)' }}>
                <Teammate look={squad.a[i]} kit={event.kit} height={Math.round(heroH * p.s)} delay={i * 0.09 + 0.05} />
              </div>
            ))}

          {/* spotlight on the captain (the beam grows when the trophy lands) */}
          <motion.div
            className="absolute left-1/2 top-0"
            style={{ width: heroH * 1.5, height: '100%', marginLeft: -heroH * 0.75, transform: 'translateZ(-30px)', background: `radial-gradient(ellipse at 50% 0%, ${palette.glow}55, transparent 70%)`, clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)' }}
            initial={{ opacity: solo ? 0.7 : 0.15 }}
            animate={{ opacity: lifted ? 0.85 : solo ? 0.7 : 0.25 }}
            transition={{ duration: 0.6 }}
          />

          {/* you */}
          <motion.div
            className="absolute left-1/2"
            style={{ bottom: stageH - Math.round(heroH * (20 / 170)), width: Math.round((heroH * 200) / 170), marginLeft: -Math.round((heroH * 100) / 170), z: 40 }}
            initial={{ y: 60, opacity: 0, scale: 0.92 }}
            animate={{ y: lifted ? [0, -9, 0] : 0, opacity: 1, scale: 1 }}
            transition={lifted ? { y: { duration: 0.62, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.5 } } : { duration: 0.8, ease: 'easeOut' }}
          >
            <MomentScene look={look} kit={event.kit} pose={phase >= 1 ? 'trophy' : 'arms'} expression="cheer" height={heroH} hideTrophy />
            {/* the trophy comes down from the sky into your hands */}
            {phase >= 1 && (
              <>
                <motion.div
                  className="pointer-events-none absolute left-1/2 rounded-full"
                  style={{ top: `${(25 / 190) * 100}%`, width: heroH * 0.9, height: heroH * 0.9, marginLeft: -heroH * 0.45, marginTop: -heroH * 0.45, background: `radial-gradient(circle, ${palette.glow}aa, transparent 62%)` }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0.75], scale: [0.4, 1.3, 1] }}
                  transition={{ duration: 1.6, delay: 0.6 }}
                />
                <motion.div
                  className="absolute left-1/2"
                  style={{ top: `${(25 / 190) * 100}%`, width: 40 * 1.2 * trophyUnit, height: 60 * 1.2 * trophyUnit, marginLeft: -20 * 1.2 * trophyUnit, marginTop: -30 * 1.2 * trophyUnit }}
                  initial={{ y: -heroH * 1.5, scale: 2.4, opacity: 0, rotate: -28 }}
                  animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 70, damping: 11, mass: 1.1 }}
                >
                  <svg viewBox="-20 -30 40 60" className="h-full w-full overflow-visible drop-shadow-[0_0_18px_rgba(251,191,36,0.8)]">
                    <TrophyArt kind={event.trophyKind} accent={event.accent} />
                  </svg>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* the front of the stage (hides the lower bodies) */}
          <div className="absolute" style={{ left: '-40%', right: '-40%', bottom: 0, height: stageH, transform: 'translateZ(70px)' }}>
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${event.kit}, #000)` }} />
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
            <div className="absolute inset-x-0 top-3 flex items-center justify-center font-display text-3xl font-extrabold uppercase tracking-[0.18em] text-white/90">{event.team}</div>
          </div>
        </motion.div>
      </div>

      {/* effects over everything */}
      {lifted && <Fireworks colors={fire} />}
      {lifted && <ConfettiRain colors={confetti} />}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div key="flash" className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }} />
        )}
      </AnimatePresence>

      {/* headline */}
      <div className="pointer-events-none absolute inset-x-0 top-[7%] px-5 text-center">
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, scale: 1.6, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
              <div className={`font-display font-extrabold uppercase leading-[0.95] tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)] ${HEADLINE[event.scenario].length > 16 ? 'text-[36px]' : 'text-[52px]'} bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 bg-clip-text text-transparent`}>{t(HEADLINE[event.scenario])}</div>
              <div className="mt-2 text-[15px] font-bold text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{t(event.trophy)}</div>
              <div className="mt-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                {event.team}
                {playerName ? ` · ${playerName}` : ''}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* timeline */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
        <motion.div className="h-full bg-gradient-to-r from-amber-300 to-amber-500" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: CEREMONY_SECONDS, ease: 'linear' }} />
      </div>

      {/* nothing to touch until the end */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-4 pb-[calc(1.1rem+env(safe-area-inset-bottom))]" style={{ zIndex: 5 }}>
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
              <Button block size="lg" onClick={onClose}>
                {t('Continue')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
