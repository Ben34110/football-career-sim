'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { getClub } from '@/lib/data/clubs';
import { getNationality } from '@/lib/data/nationalities';
import { ATTR_LABEL, calcOvr, fmtMoneyM, marketValue } from '@/lib/engine/player';
import type { Look } from '@/lib/data/look';
import { useT } from '@/lib/i18n';
import type { AttrKey, Attributes, Position } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Crest } from './Crest';
import { HeadAvatar } from './HeadAvatar';

interface Props {
  name: string;
  nationality: string;
  position: Position;
  attrs: Attributes;
  age: number;
  clubId: string | null;
  look?: Look;
  className?: string;
  /** Animate OVR change in the FTUE */
  compact?: boolean;
}

const SHORT: Record<AttrKey, string> = { finishing: 'FIN', composure: 'COM', vision: 'VIS', stamina: 'STA' };

const ATTR_INFO: Record<AttrKey, string> = {
  finishing: 'How clinically you convert chances. Drives your goals, shots and mini-game strikes.',
  composure: 'Nerve under pressure: penalties, free kicks, one-on-ones and tough decisions.',
  vision: 'Reading the game and finding the killer pass. Drives your assists and playmaking choices.',
  stamina: 'Energy over 90 minutes. Helps you press, track back and win physical duels.',
};

export function PlayerCard({ name, nationality, position, attrs, age, clubId, look, className, compact }: Props) {
  const t = useT();
  const [info, setInfo] = useState<AttrKey | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const showInfo = (k: AttrKey) => {
    if (timer.current) clearTimeout(timer.current);
    setInfo((cur) => (cur === k ? null : k));
    timer.current = setTimeout(() => setInfo(null), 4000);
  };
  const nat = getNationality(nationality);
  const club = getClub(clubId);
  const ovr = calcOvr(attrs, position);
  const value = marketValue(ovr, age);
  const elite = ovr >= 85;
  return (
    <div
      className={cn(
        'gloss-edge gold-edge relative overflow-hidden rounded-[26px] border border-gold-300/30 p-4 shadow-gold',
        elite
          ? 'bg-gradient-to-br from-gold-300/30 via-zinc-900 to-zinc-950'
          : 'bg-gradient-to-br from-gold-400/[0.17] via-zinc-900 to-zinc-950',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-300/20 blur-3xl" />
      <div aria-hidden className="pitch-lines pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col items-center">
          <motion.span
            key={ovr}
            initial={{ scale: 1.35, color: '#6ee7b7' }}
            animate={{ scale: 1, color: '#fbe7a1' }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className={cn('font-num font-extrabold leading-[0.9] drop-shadow-[0_0_14px_rgba(242,193,78,0.5)]', compact ? 'text-6xl' : 'text-7xl')}
          >
            {ovr}
          </motion.span>
          <span className="font-display text-lg font-bold tracking-[0.2em] text-gold-300">{position}</span>
          <span className="mt-1 text-xl leading-none" aria-label={t(nat.name)}>{nat.flag}</span>
        </div>
        <HeadAvatar look={look} size={compact ? 84 : 104} className="-mt-1 drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
        <div className="flex flex-col items-end text-right">
          {club ? <Crest short={club.short} color={club.color} size={compact ? 38 : 46} /> : <span className="eyebrow">{t('Free agent')}</span>}
          <span className="mt-1.5 max-w-[110px] truncate text-[11px] font-medium text-zinc-400">{club?.name ?? '—'}</span>
          <span className="text-[11px] text-zinc-500">{t('Age')} {age}</span>
        </div>
      </div>
      <div className="relative mt-3 text-center">
        <div className="truncate font-display text-[26px] font-extrabold uppercase leading-none tracking-wide text-zinc-50">{name || t('Your Name')}</div>
        <div className="mx-auto mt-2 h-px w-3/4 bg-gradient-to-r from-transparent via-gold-300/50 to-transparent" />
      </div>
      <div className="relative mt-3 grid grid-cols-4 gap-1.5">
        {(Object.keys(SHORT) as AttrKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => showInfo(k)}
            aria-pressed={info === k}
            aria-label={t(ATTR_LABEL[k])}
            className={cn(
              'rounded-xl border bg-black/30 py-1.5 text-center transition-all active:scale-95',
              info === k ? 'border-gold-300/60 bg-gold-400/10' : 'border-white/[0.07]',
            )}
          >
            <div className="font-num text-xl font-bold leading-none text-zinc-50">{attrs[k]}</div>
            <div className="mt-0.5 text-[9px] font-bold tracking-[0.16em] text-gold-300/80">{t(SHORT[k])}</div>
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {info && (
          <motion.div
            key={info}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden"
          >
            <p className="mt-2 rounded-xl border border-gold-300/25 bg-black/40 px-3 py-2 text-[12px] leading-snug text-zinc-200">
              <b className="text-gold-300">{t(ATTR_LABEL[info])}</b> — {t(ATTR_INFO[info])}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative mt-3 flex items-center justify-between text-xs">
        <span className="eyebrow">{t('Market value')}</span>
        <span className="font-num text-base font-bold text-gold-300">{fmtMoneyM(value)}</span>
      </div>
    </div>
  );
}
