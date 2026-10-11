'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Heart, Home as HomeIcon, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { BOOSTS } from '@/lib/data/boosts';
import type { Mate } from '@/lib/data/room';
import { ROOM_RITUAL, type Ritual, type RitualOption } from '@/lib/data/rituals';
import { EXPECTATION_TARGET } from '@/lib/data/speeches';
import { REP_LABEL } from '@/lib/engine/player';
import { fmtShortDate } from '@/lib/dates';
import { useLang, useT } from '@/lib/i18n';
import { fmtCountdown, cn, roundLabel } from '@/lib/utils';
import type { Fixture, RepKey } from '@/lib/types';
import type { TeamBadge } from './LiveMatch';
import { GameIcon } from '@/components/ui/GameIcon';
import { DressingRoom } from './DressingRoom';

const KIND_LABEL: Record<Fixture['kind'], string> = {
  league: 'League',
  cup: 'Domestic Cup',
  intl: 'International',
  tournament: 'Tournament',
  euro: 'Europe',
};

export function PreMatch({
  fixture,
  competitionName,
  me,
  opp,
  myStrength,
  room,
  bolts,
  msToNext,
  fatigueRelief = 0,
  benchWhy,
  date,
  boosts,
  onKickoff,
}: {
  fixture: Fixture;
  /** Short name of the tournament, for national tournament games */
  competitionName?: string;
  me: TeamBadge;
  opp: TeamBadge;
  myStrength: number;
  /** The teammates in the dressing room for this fixture */
  room: { mates: Mate[]; seed: string };
  bolts: number;
  msToNext: number;
  fatigueRelief?: number;
  benchWhy: 'trust' | 'form' | null;
  date: Date;
  /** Boosts in the bag (id → quantity) */
  boosts?: Record<string, number>;
  onKickoff: (o: RitualOption, ritual: Ritual, boostId: string | null) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const [picked, setPicked] = useState<RitualOption | null>(null);
  const [boostId, setBoostId] = useState<string | null>(null);
  const owned = BOOSTS.filter((b) => (boosts?.[b.id] ?? 0) > 0);
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
          <Chip tone="gold">{competitionName ?? t(KIND_LABEL[fixture.kind])}</Chip>
          <span className="eyebrow">{t(roundLabel(fixture.kind, fixture.label))} · {fmtShortDate(date, lang)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            {left.rank && <span className="whitespace-pre-line rounded-xl border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-bold leading-tight text-zinc-300">{left.rank}</span>}
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
            {right.rank && <span className="whitespace-pre-line rounded-xl border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-bold leading-tight text-zinc-300">{right.rank}</span>}
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

      {/* The pre-match moment: read the dressing room, talk to the right teammate */}
      <div>
        <DressingRoom mates={room.mates} seed={room.seed} kit={me.color} onPick={setPicked} />
        <AnimatePresence initial={false}>
          {picked && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="info">{t('Morale')} +{picked.morale}</Chip>
                  {(Object.entries(picked.rep) as [RepKey, number][]).map(([k, v]) => (
                    <Chip key={k} tone={v > 0 ? 'good' : 'bad'}>
                      {t(REP_LABEL[k].replace(' Respect', ''))} {v > 0 ? '+' : ''}
                      {v}
                    </Chip>
                  ))}
                  {picked.perfBonus > 0 && <Chip tone="gold">+{picked.perfBonus} {t('form')}</Chip>}
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

      {/* Optional boost: one per match, bought with money */}
      <div>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h2 className="eyebrow">{t('Boost')}</h2>
          {owned.length === 0 && (
            <Link href="/shop" className="text-[11px] font-semibold text-neon-400">
              {t('Get boosts in the shop')}
            </Link>
          )}
        </div>
        {owned.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <button
              onClick={() => setBoostId(null)}
              aria-pressed={boostId === null}
              className={cn('shrink-0 rounded-2xl border px-3.5 py-2.5 text-[13px] font-bold', boostId === null ? 'border-neon-400/60 bg-neon-400/10 text-neon-300' : 'border-white/[0.08] bg-white/[0.04] text-zinc-400')}
            >
              {t('None')}
            </button>
            {owned.map((b) => (
              <button
                key={b.id}
                onClick={() => setBoostId(b.id)}
                aria-pressed={boostId === b.id}
                className={cn('flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left', boostId === b.id ? 'border-gold-400/60 bg-gold-400/10 shadow-gold' : 'border-white/[0.08] bg-white/[0.04]')}
              >
                <GameIcon e={b.emoji} className="h-5 w-5 text-gold-300" />
                <span>
                  <span className="block text-[13px] font-bold leading-tight">
                    {t(b.name)} <span className="text-gold-300">×{boosts?.[b.id]}</span>
                  </span>
                  <span className="block max-w-[170px] truncate text-[10px] text-zinc-400">{t(b.desc)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <FloatingAction>
        <Button block size="lg" disabled={!picked || exhausted} onClick={() => picked && onKickoff(picked, ROOM_RITUAL, boostId)}>
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
