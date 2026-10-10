'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Heart, Home as HomeIcon, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import type { Ritual, RitualOption } from '@/lib/data/rituals';
import { EXPECTATION_TARGET } from '@/lib/data/speeches';
import { repetition } from '@/lib/data/talks';
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
  ritual,
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
  ritual: Ritual;
  bolts: number;
  msToNext: number;
  fatigueRelief?: number;
  benchWhy: 'trust' | 'form' | null;
  date: Date;
  /** What the player said lately (repetition, reactions) */
  talks?: TalkMemory;
  onKickoff: (o: RitualOption, ritual: Ritual) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const [picked, setPicked] = useState<RitualOption | null>(null);
  // repeating the same choice week after week weakens it
  const rpt = picked ? repetition(talks?.stances ?? [], picked.id) : { count: 0, factor: 1 };
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

      {/* The pre-match moment: a different format every time, one tap */}
      <div>
        <div className="mb-2.5 flex items-center gap-2 px-0.5">
          <span className="text-lg">{ritual.emoji}</span>
          <h2 className="eyebrow">{t(ritual.title)}</h2>
        </div>
        <p className="mb-3 px-0.5 text-[15px] font-semibold leading-snug text-zinc-100">{t(ritual.prompt, { opp: opp.name })}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {ritual.options.map((op, i) => {
            const active = picked?.id === op.id;
            return (
              <motion.button
                key={op.id}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.06 * i }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPicked(op)}
                aria-pressed={active}
                className={cn(
                  'gloss-edge flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-4 text-center transition-all',
                  active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
                )}
              >
                <span className="text-3xl">{op.emoji}</span>
                <span className="text-[14px] font-bold leading-tight">{t(op.label)}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {picked && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                <p className="text-[14px] italic text-zinc-200">{t(picked.line)}</p>
                {rpt.count >= 2 && <p className="mt-1.5 text-xs font-semibold text-crimson-400">{t('You keep doing the same thing — less effect (−{n}%).', { n: Math.round((1 - rpt.factor) * 100) })}</p>}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Chip tone="info">{t('Morale')} +{Math.round(picked.morale * rpt.factor)}</Chip>
                  {(Object.entries(picked.rep) as [RepKey, number][]).map(([k, v]) => (
                    <Chip key={k} tone={v > 0 ? 'good' : 'bad'}>
                      {t(REP_LABEL[k].replace(' Respect', ''))} {v > 0 ? '+' : ''}
                      {v}
                    </Chip>
                  ))}
                  <Chip tone="gold">+{picked.perfBonus} {t('form')}</Chip>
                  {picked.brief && <Chip tone="info">{t('Tactical call')}</Chip>}
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  {t('Expectation')}: <b className="text-zinc-300">{t(picked.expectation)}</b> — {t('you’re judged against a {r}+ rating.', { r: (EXPECTATION_TARGET[picked.expectation] + (picked.brief?.target ?? 0)).toFixed(1) })}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FloatingAction>
        <Button block size="lg" disabled={!picked || exhausted} onClick={() => picked && onKickoff(picked, ritual)}>
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
