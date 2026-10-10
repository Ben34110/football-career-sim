'use client';

import { Flag } from '@/components/ui/Flag';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Shield, ShieldOff } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { fmtShortDate } from '@/lib/dates';
import { getNationality } from '@/lib/data/nationalities';
import { haptic } from '@/lib/haptics';
import { useLang, useT } from '@/lib/i18n';
import { useUiStore, type CallUpEvent } from '@/lib/ui';
import { cn } from '@/lib/utils';

const CALLED_QUOTES = [
  '“Your performances have earned this. Represent your country with pride.”',
  '“We need players in form, and you have been impressive lately.”',
  '“The badge is a responsibility. I know you will carry it well.”',
];

const OMITTED_TEXT = {
  form: 'Your recent form is not good enough: the national coach wants players in rhythm.',
  level: 'You have the level, but others are ahead of you for now. Keep improving.',
  unlucky: 'A tough call: the coach went with other players this time. Your chance will come.',
} as const;

/** National-team selection: shown after the match flow, never in the middle of it. */
export function CallUpPopup() {
  const event = useUiStore((s) => s.callUps[0]);
  const immersive = useUiStore((s) => s.immersive);
  const shift = useUiStore((s) => s.shiftCallUp);
  return <AnimatePresence>{event && !immersive && <Card key={event.id} event={event} onClose={shift} />}</AnimatePresence>;
}

function Card({ event, onClose }: { event: CallUpEvent; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const nat = getNationality(event.nationCode);
  const called = event.outcome === 'called';
  const team = `${t(nat.name)}${event.level !== 'A' ? ' ' + event.level : ''}`;
  const quote = useMemo(() => CALLED_QUOTES[Math.floor(Math.random() * CALLED_QUOTES.length)], []);

  useEffect(() => {
    haptic(called ? [40, 40, 90] : [90]);
  }, [called]);

  return (
    <motion.div
      className="fixed inset-0 z-[65] mx-auto flex max-w-[430px] items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label={called ? t('Called up!') : t('Not selected')}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.7, y: 40, rotate: called ? -3 : 0, opacity: 0 }}
        animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-[26px] border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]',
          called ? 'border-gold-300/50 bg-gradient-to-b from-zinc-800 to-zinc-950' : 'border-white/15 bg-gradient-to-b from-zinc-800 to-zinc-950',
        )}
      >
        <div className={cn('flex items-center gap-3 px-5 py-4', called ? 'bg-gradient-to-r from-gold-400/30 to-transparent' : 'bg-white/[0.05]')}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40"><Flag emoji={nat.flag} size={26} className="rounded-[3px]" /></div>
          <div className="min-w-0">
            <div className={cn('text-[11px] font-bold uppercase tracking-[0.2em]', called ? 'text-gold-300' : 'text-zinc-400')}>{t('National team')}</div>
            <div className="truncate font-display text-2xl font-extrabold uppercase leading-none">{team}</div>
          </div>
          <div className="ml-auto text-gold-300">{called ? <Shield className="h-7 w-7" /> : <ShieldOff className="h-7 w-7 text-zinc-500" />}</div>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <div>
            <h2 className={cn('font-display text-4xl font-extrabold uppercase leading-none', called ? 'text-gold-200' : 'text-zinc-200')}>
              {called ? t('Called up!') : t('Not selected')}
            </h2>
            {event.competition && <p className="mt-1 text-sm font-semibold text-zinc-300">🏆 {t(event.competition)}</p>}
          </div>

          {called ? (
            <>
              <div className="space-y-1.5">
                <div className="eyebrow">{event.competition ? t('Matches to play') : t('Your match')}</div>
                {event.matches.map((m, i) => (
                  <div key={`${m.label}-${i}`} className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2 text-[13px]">
                    <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate">
                      <b>{t(m.label)}</b>
                      <span className="text-zinc-400"> · {m.opponent ? t(m.opponent) : t('Opponent to be drawn')}</span>
                    </span>
                    {m.date && <span className="shrink-0 text-[11px] font-semibold text-zinc-500">{fmtShortDate(new Date(m.date), lang)}</span>}
                  </div>
                ))}
              </div>
              <p className="text-[13px] italic leading-snug text-zinc-400">{t(quote)}</p>
            </>
          ) : (
            <p className="text-sm leading-snug text-zinc-300">{t(OMITTED_TEXT[event.reason ?? 'unlucky'])}</p>
          )}

          <Button block size="lg" variant={called ? 'gold' : 'ghost'} onClick={onClose}>
            {called ? t('Let’s go!') : t('Understood')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
