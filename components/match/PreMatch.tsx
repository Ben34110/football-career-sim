'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Heart, Home as HomeIcon, MapPin, Mic2, Swords } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { INSTRUCTIONS, pickInstructions, type Instruction } from '@/lib/data/briefing';
import { EXPECTATION_TARGET, type Speech, type StanceEffect } from '@/lib/data/speeches';
import { managerReaction, repetition } from '@/lib/data/talks';
import { REP_LABEL } from '@/lib/engine/player';
import { fmtShortDate } from '@/lib/dates';
import { useLang, useT } from '@/lib/i18n';
import { fmtCountdown, cn } from '@/lib/utils';
import type { Fixture, RepKey, TalkMemory } from '@/lib/types';
import type { TeamBadge } from './LiveMatch';

const KIND_LABEL: Record<Fixture['kind'], string> = {
  league: 'League',
  cup: 'Domestic Cup',
  intl: 'International',
  tournament: 'Tournament',
  euro: 'Europe',
};

export function PreMatch({
  fixture,
  me,
  opp,
  myStrength,
  speech,
  bolts,
  msToNext,
  fatigueRelief = 0,
  benchWhy,
  date,
  talks,
  onKickoff,
}: {
  fixture: Fixture;
  me: TeamBadge;
  opp: TeamBadge;
  myStrength: number;
  speech: Speech;
  bolts: number;
  msToNext: number;
  fatigueRelief?: number;
  benchWhy: 'trust' | 'form' | null;
  date: Date;
  /** What the player said lately (repetition, reactions) */
  talks?: TalkMemory;
  onKickoff: (s: StanceEffect, instruction: Instruction) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const [picked, setPicked] = useState<StanceEffect | null>(null);
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  // repeating yourself weakens the effect, and the manager notices
  const rpt = picked ? repetition(talks?.stances ?? [], picked.id) : { count: 0, factor: 1 };
  const reaction = useMemo(() => (picked ? managerReaction(picked, rpt.count) : ''), [picked?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the offered briefs depend on how you spoke (decided once per stance)
  const offered = useMemo(() => (picked ? pickInstructions(picked.id, Math.random, talks?.instructions ?? []) : []), [picked?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const diff = myStrength - fixture.opponentStrength;
  const tag = diff >= 4 ? { t: 'Favourites', tone: 'good' as const } : diff <= -4 ? { t: 'Underdogs', tone: 'bad' as const } : { t: 'Even match', tone: 'gold' as const };
  const exhausted = bolts < 1;
  // home team on the left
  const left = fixture.home ? me : opp;
  const right = fixture.home ? opp : me;

  return (
    <div className="space-y-4">
      {/* Fixture hero */}
      <Card strong gold className="overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between">
          <Chip tone="gold">{t(KIND_LABEL[fixture.kind])}</Chip>
          <span className="eyebrow">{t(fixture.label)} · {fmtShortDate(date, lang)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <Crest short={left.short} color={left.color} size={56} />
            <span className="line-clamp-2 text-xs font-bold">{left.name}</span>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-extrabold text-zinc-600">VS</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-400">
              {fixture.home ? <HomeIcon className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {fixture.home ? t('You are at home') : t('You are away')}
            </div>
          </div>
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <Crest short={right.short} color={right.color} size={56} />
            <span className="line-clamp-2 text-xs font-bold">{right.name}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-xs">
          <span className="text-zinc-400">
            {t('Squad')} <b className="font-num text-sm text-zinc-100">{Math.round(myStrength)}</b> {t('vs')} <b className="font-num text-sm text-zinc-100">{fixture.opponentStrength}</b>
          </span>
          <Chip tone={tag.tone}>{t(tag.t)}</Chip>
        </div>
        {fixture.knockout && <p className="mt-2 text-center text-[11px] text-gold-300">{t('Knockout tie — a draw goes to penalties.')}</p>}
      </Card>

      {(benchWhy || (bolts >= 1 && bolts + fatigueRelief < 5)) && (
        <div className="space-y-2">
          {benchWhy && (
            <Warn>
              {benchWhy === 'trust'
                ? t('Coach Trust is low — you’ll start on the bench and come on after 55 minutes.')
                : t('Your recent form is poor — the coach will leave you on the bench and bring you on after 55 minutes.')}
            </Warn>
          )}
          {bolts + fatigueRelief < 5 && bolts >= 1 && (
            <Warn>
              {t('Playing on {n} life/lives: fatigue costs you −{m} effective OVR.', { n: bolts, m: Math.max(0, 5 - bolts - fatigueRelief) })}
            </Warn>
          )}
        </div>
      )}

      {exhausted && (
        <Link href="/shop" className="flex items-center justify-between rounded-xl border border-crimson-500/30 bg-crimson-500/10 px-3 py-2.5 text-xs font-semibold text-crimson-400 active:scale-[0.98]">
          <span>{t('Out of lives? Get more in the shop.')}</span>
          <Heart className="h-4 w-4 fill-current" />
        </Link>
      )}

      {/* Locker room talk */}
      <div>
        <div className="mb-2.5 flex items-center gap-2 px-0.5">
          <Mic2 className="h-4 w-4 text-gold-300" />
          <h2 className="eyebrow">{t('Locker room talk')}</h2>
        </div>
        <Card className="p-4">
          <div className="mb-2.5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 font-display text-lg font-bold">
              M
            </div>
            <div>
              <div className="text-sm font-bold">{t('The Manager')}</div>
              <div className="text-[11px] text-zinc-500">{t(speech.title)}</div>
            </div>
          </div>
          <p className="text-[15px] italic leading-relaxed text-zinc-200">{t(speech.quote)}</p>
        </Card>

        <p className="mb-2 mt-4 px-0.5 text-xs font-semibold text-zinc-400">{t('How do you respond?')}</p>
        <div className="space-y-2.5">
          {speech.stances.map((st, i) => {
            const active = picked?.id === st.id;
            return (
              <motion.button
                key={st.id}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 * i }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setPicked(st);
                  setInstruction(null);
                }}
                aria-pressed={active}
                className={cn(
                  'gloss-edge w-full rounded-2xl border p-3.5 text-left transition-all',
                  active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold">{t(st.label)}</span>
                  <div className="flex items-center gap-1.5">
                    <Chip tone={st.tone}>{t(st.tag)}</Chip>
                    {active && <Check className="h-4 w-4 text-neon-400" />}
                  </div>
                </div>
                <p className="mt-1.5 text-[13px] italic text-zinc-400">{t(st.quote)}</p>
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        <Chip tone="info">{t('Morale')} {st.morale > 0 ? '+' : ''}{st.morale}</Chip>
                        {(Object.entries(st.rep) as [RepKey, number][]).map(([k, v]) => (
                          <Chip key={k} tone={v > 0 ? 'good' : 'bad'}>
                            {t(REP_LABEL[k].replace(' Respect', ''))} {v > 0 ? '+' : ''}
                            {v}
                          </Chip>
                        ))}
                        <Chip tone="gold">+{st.perfBonus} {t('form')}</Chip>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">
                        {t('Expectation')}: <b className="text-zinc-300">{t(st.expectation)}</b> — {t('you’re judged against a {r}+ rating.', { r: EXPECTATION_TARGET[st.expectation].toFixed(1) })}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* The manager answers, then a short tactical brief */}
      <AnimatePresence>
        {picked && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 font-display text-base font-bold">M</div>
                <div className="text-sm font-bold">{t('The Manager')}</div>
                {rpt.count >= 2 && <Chip tone="bad">{t('Predictable: −{n}% effect', { n: Math.round((1 - rpt.factor) * 100) })}</Chip>}
              </div>
              <p className="text-[14px] italic leading-relaxed text-zinc-200">{t(reaction, { opp: opp.name })}</p>
            </Card>

            <div>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <Swords className="h-4 w-4 text-neon-400" />
                <h2 className="eyebrow">{t('Tactical brief')}</h2>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {offered.map((ins, i) => {
                  const active = instruction?.id === ins.id;
                  return (
                    <motion.button
                      key={ins.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.07 * i }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInstruction(ins)}
                      aria-pressed={active}
                      className={cn(
                        'gloss-edge flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all',
                        active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
                      )}
                    >
                      <span className="text-2xl">{ins.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold">{t(ins.label)}</span>
                        <span className="block text-xs text-zinc-400">{t(ins.hint)}</span>
                      </span>
                      {active && <Check className="h-4 w-4 text-neon-400" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingAction>
        <Button block size="lg" disabled={!picked || !instruction || exhausted} onClick={() => picked && instruction && onKickoff(picked, instruction)}>
          {exhausted ? (
            <>{t('No lives left · next one in {time}', { time: fmtCountdown(msToNext) })}</>
          ) : (
            <>
              {t('Kick off')} <span className="flex items-center gap-0.5 rounded-full bg-black/20 px-2 py-0.5 text-xs">−1 <Heart className="h-3 w-3 fill-current" /></span>
            </>
          )}
        </Button>
      </FloatingAction>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gold-400/25 bg-gold-400/[0.07] px-3 py-2 text-xs text-gold-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
      <span>{children}</span>
    </div>
  );
}
