'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Anchor, Check, CloudRain, Crosshair, Crown, Flame, HeartHandshake, Leaf, Sunrise, Wind, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { HeadAvatar } from '@/components/ui/HeadAvatar';
import { APPROACHES, MOOD_FACE, MOOD_LABEL, ROLE_LABEL, talk, type Approach, type Mate, type Mood, type TalkOutcome } from '@/lib/data/room';
import type { RitualOption } from '@/lib/data/rituals';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const MOOD_ICON: Record<Mood, LucideIcon> = { nervous: Wind, cocky: Crown, down: CloudRain, wound: Flame, calm: Leaf };
const MOOD_TONE: Record<Mood, string> = {
  nervous: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  cocky: 'border-gold-400/40 bg-gold-400/10 text-gold-300',
  down: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300',
  wound: 'border-crimson-500/40 bg-crimson-500/10 text-crimson-400',
  calm: 'border-neon-400/40 bg-neon-400/10 text-neon-300',
};
const APPROACH_ICON: Record<Approach, LucideIcon> = { reassure: HeartHandshake, ground: Anchor, lift: Sunrise, focus: Crosshair };

/**
 * The dressing room: four teammates, each with a face and a line that gives away his mood.
 * Pick one, then pick the words. Once you have spoken, the moods of the whole room are revealed.
 */
export function DressingRoom({ mates, seed, kit, onPick }: { mates: Mate[]; seed: string; kit: string; onPick: (o: RitualOption) => void }) {
  const t = useT();
  const [who, setWho] = useState<string | null>(null);
  const [out, setOut] = useState<TalkOutcome | null>(null);
  const done = out !== null;
  const mate = mates.find((m) => m.id === who);

  const say = (a: Approach) => {
    if (!mate || done) return;
    const res = talk(mate, a, seed);
    setOut(res);
    onPick(res.option);
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 className="eyebrow">{t('The dressing room')}</h2>
        <span className="text-[11px] font-semibold text-zinc-500">{done ? t('Said') : t('One word, one teammate')}</span>
      </div>
      <p className="mb-3 px-0.5 text-[15px] font-semibold leading-snug text-zinc-100">
        {done ? (out.right ? t('It landed.') : t('It did not land.')) : t('Read the room. Who needs you right now?')}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {mates.map((m, i) => {
          const chosen = who === m.id;
          const MoodIcon = MOOD_ICON[m.mood];
          const face = done && chosen && out.right ? 'happy' : MOOD_FACE[m.mood];
          return (
            <motion.button
              key={m.id}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: done && !chosen ? 0.7 : 1 }}
              transition={{ delay: 0.06 * i }}
              whileTap={done ? undefined : { scale: 0.96 }}
              onClick={() => !done && setWho(m.id)}
              aria-pressed={chosen}
              disabled={done}
              className={cn(
                'gloss-edge relative flex flex-col items-center gap-1.5 rounded-2xl border px-2.5 pb-3 pt-3 text-center transition-all',
                chosen ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
              )}
            >
              <HeadAvatar look={m.look} size={64} framed kit={kit} expression={face} />
              <div className="flex items-center gap-1 text-[13px] font-bold leading-tight">
                {m.role === 'captain' && <Crown className="h-3.5 w-3.5 text-gold-300" aria-hidden />}
                {m.name}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t(ROLE_LABEL[m.role])}</div>
              <p className="text-[12px] italic leading-snug text-zinc-300">“{t(m.quote)}”</p>
              <AnimatePresence>
                {done && (
                  <motion.span
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn('mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', MOOD_TONE[m.mood])}
                  >
                    <MoodIcon className="h-3 w-3" aria-hidden />
                    {t(MOOD_LABEL[m.mood])}
                  </motion.span>
                )}
              </AnimatePresence>
              {done && chosen && (
                <span className={cn('absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full', out.right ? 'bg-neon-400 text-black' : 'bg-crimson-500 text-white')}>
                  {out.right ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {mate && !done && (
          <motion.div key="words" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mb-2 mt-3.5 px-0.5 text-[12px] font-semibold text-zinc-400">
              {t('What do you say to {name}?', { name: mate.name })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {APPROACHES.map((a) => {
                const Icon = APPROACH_ICON[a.id];
                return (
                  <motion.button
                    key={a.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => say(a.id)}
                    className="gloss-edge flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left"
                  >
                    <Icon className="h-6 w-6 shrink-0 text-gold-300" aria-hidden />
                    <span>
                      <span className="block text-[13px] font-bold leading-tight">{t(a.label)}</span>
                      <span className="block text-[10px] leading-tight text-zinc-500">{t(a.hint)}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
        {done && mate && (
          <motion.div key="reply" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
            <p className="text-[14px] italic text-zinc-200">
              <b className="not-italic text-zinc-100">{mate.name}</b> · {t(out.reply)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
