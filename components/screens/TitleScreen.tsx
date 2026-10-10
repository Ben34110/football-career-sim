'use client';

import { Flag } from '@/components/ui/Flag';
import { motion } from 'framer-motion';
import { ChevronRight, Play, Plus, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { getClub } from '@/lib/data/clubs';
import { getNationality } from '@/lib/data/nationalities';
import { ovrOf, seasonLabel } from '@/lib/engine/player';
import { LangToggle } from '@/components/ui/LangToggle';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';

export function TitleScreen() {
  const t = useT();
  const router = useRouter();
  const { hasCareer, player, year } = useGameStore();
  const [confirm, setConfirm] = useState(false);
  const club = getClub(player?.clubId ?? null);

  return (
    <div className="pt-safe pb-safe relative flex min-h-dvh flex-col justify-between overflow-hidden px-6">
      <div className="relative z-10 flex justify-end pt-4">
        <LangToggle />
      </div>
      <div aria-hidden className="pitch-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_70%)]" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -40 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14 }}
          className="relative mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-neon-400/40 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-neon animate-floaty"
        >
          <span className="absolute inset-0 rounded-full border border-neon-400/40 animate-pulseRing" />
          <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#34d399" strokeWidth="2.5" />
            <path d="M32 17l12 8.7-4.6 14.1H24.600L20 25.700z" fill="#f2c14e" />
            <path d="M32 17V8M44 25.700l9-3M39.400 39.800l5.600 8M24.600 39.800l-5.600 8M20 25.700l-9-3" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="font-display text-[64px] font-extrabold uppercase leading-[0.88] tracking-tight"
        >
          <span className="block text-zinc-50">Pitch</span>
          <span className="block bg-gradient-to-r from-gold-200 via-gold-400 to-gold-300 bg-clip-text text-transparent">Legacy</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-4 max-w-[280px] text-sm leading-relaxed text-zinc-400">
          {t('From the lower leagues to World Cup glory. Win the dressing room, own the press, step up when it matters.')}
        </motion.p>
      </div>

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }} className="relative space-y-3 pb-6">
        {hasCareer && player && (
          <button
            onClick={() => router.push('/home')}
            className="gloss-edge glass flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-gold-300/30 to-gold-500/10 font-num text-2xl font-extrabold text-gold-300">
              {ovrOf(player)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="eyebrow">{t('Continue career')}</div>
              <div className="truncate text-sm font-bold">
                <Flag emoji={getNationality(player.nationality).flag} size={12} /> {player.name} · {player.position}
              </div>
              <div className="truncate text-xs text-zinc-500">
                {club?.name ?? t('Free agent')} · {seasonLabel(year)}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-500" />
          </button>
        )}
        <Button
          size="lg"
          block
          variant={hasCareer ? 'ghost' : 'primary'}
          onClick={() => (hasCareer ? setConfirm(true) : router.push('/create'))}
        >
          {hasCareer ? <Plus className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          {hasCareer ? t('New career') : t('Start career')}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
          <Trophy className="h-3 w-3" /> {t('Saved automatically on this device')}
        </p>
      </motion.div>

      <Sheet open={confirm} dismissible onClose={() => setConfirm(false)}>
        <h3 className="font-display text-2xl font-bold uppercase">{t('Start a new career?')}</h3>
        <p className="mt-1 text-sm text-zinc-400">{t('Your current save will be replaced. This can’t be undone.')}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            {t('Keep playing')}
          </Button>
          <Button variant="danger" onClick={() => router.push('/create')}>
            {t('Replace save')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
