'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PenLine } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Crest } from '@/components/ui/Crest';
import { getClub } from '@/lib/data/clubs';
import { fmtMoneyK, fmtMoneyM } from '@/lib/engine/player';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useUiStore, type SigningEvent } from '@/lib/ui';
import type { Position } from '@/lib/types';
import { cn } from '@/lib/utils';

const NUMBER: Record<Position, number> = { ST: 9, CAM: 10, RW: 7, LW: 11 };

/** Full-screen ceremony when you sign: contract → signature → stamp → shirt reveal. */
export function SigningCeremony() {
  const event = useUiStore((s) => s.signing);
  const close = useUiStore((s) => s.closeSigning);
  return <AnimatePresence>{event && <Ceremony key={event.id} event={event} onClose={close} />}</AnimatePresence>;
}

function Ceremony({ event, onClose }: { event: SigningEvent; onClose: () => void }) {
  const t = useT();
  const reduce = useReducedMotion();
  const club = getClub(event.clubId);
  const color = club?.color ?? '#34d399';
  const full = event.kind === 'signed';
  // 0 contract · 1 stamped · 2 shirt reveal
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const fast = reduce ? 0.3 : 1;
    const ids = [
      setTimeout(() => {
        setStage(1);
        haptic([40, 30, 80]);
      }, 2700 * fast),
      setTimeout(() => {
        if (full) setStage(2);
      }, 4000 * fast),
      setTimeout(() => haptic([30, 40, 30, 40, 90]), 4300 * fast),
    ];
    return () => ids.forEach(clearTimeout);
  }, [full, reduce]);

  const surname = event.playerName.trim().split(/\s+/).slice(-1)[0].toUpperCase();
  const confetti = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 620,
        y: -120 - Math.random() * 380,
        r: Math.random() * 720 - 360,
        d: 0.1 + Math.random() * 0.5,
        c: [color, '#f2c14e', '#fafafa', '#34d399'][i % 4],
        w: 6 + Math.random() * 7,
      })),
    [color],
  );

  const title =
    event.kind === 'signed' ? t('Welcome to {club}!', { club: club?.name ?? '' }) : event.kind === 'renewal' ? t('Contract extended') : t('Deal agreed');
  const sub = event.kind === 'agreed' ? t('You join at the start of next season.') : event.kind === 'renewal' ? t('Your future is secured.') : t('A new chapter begins.');

  return (
    <motion.div
      className="fixed inset-0 z-[70] mx-auto flex max-w-[430px] flex-col items-center justify-center overflow-hidden px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md" />
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]"
        style={{ backgroundColor: color }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: stage >= 1 ? 0.38 : 0.16, scale: stage >= 1 ? 1.15 : 0.8 }}
        transition={{ duration: 1.2 }}
      />

      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-300 active:scale-95 pt-safe">
        {t('Skip')}
      </button>

      {/* ── Stage 0/1: the contract ── */}
      <AnimatePresence mode="wait">
        {stage < 2 && (
          <motion.div
            key="paper"
            initial={{ y: 520, rotate: -6, opacity: 0 }}
            animate={{ y: 0, rotate: stage === 1 ? -1.5 : 0, opacity: 1 }}
            exit={{ y: -80, scale: 0.7, opacity: 0, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 120, damping: 17 }}
            className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-[22px] bg-gradient-to-b from-zinc-100 to-zinc-300 text-zinc-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: color }}>
              {club && <Crest short={club.short} color="#ffffff" size={46} />}
              <div className="min-w-0">
                <div className="truncate font-display text-2xl font-extrabold uppercase leading-none text-white drop-shadow">{club?.name}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                  {event.kind === 'renewal' ? t('Contract extension') : t('Player contract')}
                </div>
              </div>
            </div>
            <div className="space-y-2.5 px-5 py-4 text-[13px]">
              <Row label={t('Player')} value={event.playerName} />
              <Row label={t('Length')} value={`${event.years} ${t('yrs')}`} />
              <Row label={t('Wage / wk')} value={fmtMoneyK(event.wage)} />
              {event.fee > 0 && <Row label={t('Fee')} value={fmtMoneyM(event.fee)} />}
              <div className="pt-3">
                <div className="flex items-end gap-2 border-b-2 border-zinc-500/70 pb-1">
                  <div className="relative h-11 flex-1 overflow-hidden">
                    <motion.span
                      className="absolute bottom-0 left-0 whitespace-nowrap text-[34px] leading-none text-indigo-900"
                      style={{ fontFamily: '"Brush Script MT","Snell Roundhand","Segoe Script",cursive', fontStyle: 'italic' }}
                      initial={{ clipPath: 'inset(0 100% 0 0)' }}
                      animate={{ clipPath: 'inset(0 0% 0 0)' }}
                      transition={{ delay: 0.9, duration: 1.6, ease: 'easeInOut' }}
                    >
                      {event.playerName}
                    </motion.span>
                  </div>
                  <motion.span initial={{ opacity: 0, x: -30, rotate: -20 }} animate={{ opacity: [0, 1, 1, 0], x: [-30, 0, 90, 120], rotate: [-20, 0, 6, 12] }} transition={{ delay: 0.8, duration: 1.9, times: [0, 0.1, 0.9, 1] }}>
                    <PenLine className="h-5 w-5 text-zinc-700" />
                  </motion.span>
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{t('Signature')}</div>
              </div>
            </div>

            {/* the stamp */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.div
                  initial={{ scale: 3, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: -14 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                  className="pointer-events-none absolute bottom-6 right-4 rounded-xl border-[5px] border-crimson-500/90 px-3 py-1 font-display text-4xl font-extrabold uppercase tracking-wider text-crimson-500/90 mix-blend-multiply"
                >
                  {t('SIGNED')}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Stage 2: shirt reveal ── */}
        {stage >= 2 && full && (
          <motion.div key="shirt" initial={{ opacity: 0, scale: 0.6, rotateY: 90 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 14 }} className="relative z-10 flex flex-col items-center">
            <Shirt color={color} short={club?.short ?? ''} surname={surname} number={NUMBER[event.position]} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* confetti */}
      {stage >= 2 && full && !reduce && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[45%] z-20">
          {confetti.map((p) => (
            <motion.span
              key={p.id}
              className="absolute block rounded-[2px]"
              style={{ width: p.w, height: p.w * 1.6, backgroundColor: p.c }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.r }}
              transition={{ delay: p.d, duration: 2.6, ease: 'easeOut', times: [0, 0.4, 1] }}
            />
          ))}
        </div>
      )}

      {/* captions + action */}
      <div className="relative z-10 mt-6 min-h-[116px] text-center">
        <AnimatePresence>
          {(stage >= 1 && !full) || stage >= 2 ? (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
              <div>
                <h2 className="font-display text-4xl font-extrabold uppercase leading-none text-zinc-50">{title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{sub}</p>
              </div>
              <Button size="lg" variant="gold" onClick={onClose} className={cn('min-w-[200px]')}>
                {t('Let’s go!')}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-400/40 pb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}

/** Back of the new shirt: surname and number. */
function Shirt({ color, short, surname, number }: { color: string; short: string; surname: string; number: number }) {
  const long = surname.length > 9;
  return (
    <svg viewBox="0 0 240 250" className="w-[270px] drop-shadow-[0_25px_40px_rgba(0,0,0,0.7)]" role="img" aria-label={`${surname} ${number}`}>
      <defs>
        <linearGradient id="sh-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".72" />
        </linearGradient>
        <linearGradient id="sh-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M78 14 L28 38 L6 98 L48 116 L56 92 L56 236 L184 236 L184 92 L192 116 L234 98 L212 38 L162 14 C150 34 90 34 78 14 Z" fill="url(#sh-g)" stroke="rgba(0,0,0,.35)" strokeWidth="2" />
      <path d="M78 14 L28 38 L6 98 L48 116 L56 92 L56 236 L184 236 L184 92 L192 116 L234 98 L212 38 L162 14 C150 34 90 34 78 14 Z" fill="url(#sh-shine)" />
      <path d="M78 14 C90 34 150 34 162 14" fill="none" stroke="#f2c14e" strokeWidth="5" strokeLinecap="round" />
      <path d="M6 98 L48 116 M234 98 L192 116" stroke="#f2c14e" strokeWidth="5" strokeLinecap="round" />
      <text x="120" y="82" textAnchor="middle" fontFamily="Barlow Condensed, Inter, sans-serif" fontWeight="800" fontSize={long ? 18 : 24} letterSpacing="2" fill="#fafafa" stroke="rgba(0,0,0,.25)" strokeWidth=".6">
        {surname}
      </text>
      <text x="120" y="176" textAnchor="middle" fontFamily="Barlow Condensed, Inter, sans-serif" fontWeight="800" fontSize="104" fill="#fafafa" stroke="rgba(0,0,0,.25)" strokeWidth="1">
        {number}
      </text>
      <text x="120" y="222" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="13" letterSpacing="4" fill="#f2c14e">
        {short}
      </text>
    </svg>
  );
}
