'use client';

import { AlertTriangle, Heart, Home as HomeIcon, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { TRAINING_RITUAL, type RitualOption } from '@/lib/data/rituals';
import { buildScouting, type Record3 } from '@/lib/data/scouting';
import { fmtShortDate } from '@/lib/dates';
import { useLang, useT } from '@/lib/i18n';
import { fmtCountdown, roundLabel } from '@/lib/utils';
import type { Fixture } from '@/lib/types';
import { BoostPicker } from './BoostPicker';
import type { TeamBadge } from './LiveMatch';
import { ScoutingReport } from './ScoutingReport';

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
  oppCountry,
  oppRecord,
  bolts,
  msToNext,
  fatigueRelief = 0,
  benchWhy,
  date,
  onKickoff,
}: {
  fixture: Fixture;
  /** Short name of the tournament, for national tournament games */
  competitionName?: string;
  me: TeamBadge;
  opp: TeamBadge;
  myStrength: number;
  /** Where the opponent comes from (their players' names) */
  oppCountry?: string | null;
  /** The opponent's record in the table that counts, when there is one (it shapes their recent form) */
  oppRecord?: Record3;
  bolts: number;
  msToNext: number;
  fatigueRelief?: number;
  benchWhy: 'trust' | 'form' | null;
  date: Date;
  onKickoff: (o: RitualOption, ritual: typeof TRAINING_RITUAL, boostId: string | null) => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const [boostId, setBoostId] = useState<string | null>(null);
  const scouting = useMemo(
    () => buildScouting({ seed: fixture.id, oppStrength: fixture.opponentStrength, myStrength, country: oppCountry, record: oppRecord }),
    [fixture.id, fixture.opponentStrength, myStrength, oppCountry, oppRecord],
  );
  // reading the report is the preparation: it sets what the club expects of you
  const prepared: RitualOption = useMemo(
    () => ({
      id: `scout-${fixture.id}`,
      emoji: '👀',
      label: 'Scouting report',
      line: 'You studied the scouting report.',
      morale: 3,
      perfBonus: 0,
      rep: {},
      expectation: scouting.expected.expectation,
      brief: scouting.expected.target ? { target: scouting.expected.target } : undefined,
    }),
    [fixture.id, scouting],
  );
  const diff = scouting.diff;
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

      {/* The report on the opponent, then what to take into the match */}
      <ScoutingReport oppName={opp.name} oppColor={opp.color} oppStrength={fixture.opponentStrength} myStrength={myStrength} scouting={scouting} />

      <BoostPicker selected={boostId} onSelect={setBoostId} recommended={scouting.recommended} />

      <FloatingAction>
        <Button block size="lg" disabled={exhausted} onClick={() => onKickoff(prepared, TRAINING_RITUAL, boostId)}>
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
