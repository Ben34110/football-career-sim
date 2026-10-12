'use client';

import { Armchair } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { fmtShortDate } from '@/lib/dates';
import { useLang, useT } from '@/lib/i18n';
import type { Fixture } from '@/lib/types';
import { roundLabel } from '@/lib/utils';
import type { TeamBadge } from './LiveMatch';

/** Banned after a red card: the team plays this one without you. */
export function SuspendedScreen({
  fixture,
  me,
  opp,
  matchesLeft,
  date,
  onSitOut,
}: {
  fixture: Fixture;
  me: TeamBadge;
  opp: TeamBadge;
  /** Matches of the ban still to miss, this one included */
  matchesLeft: number;
  date: Date;
  onSitOut: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const left = fixture.home ? me : opp;
  const right = fixture.home ? opp : me;
  return (
    <div className="space-y-4">
      <Card strong className="overflow-hidden border-crimson-500/30 p-4">
        <div className="mb-4 flex items-center justify-between">
          <Chip tone="bad">{t('Suspended')}</Chip>
          <span className="eyebrow">{t(roundLabel(fixture.kind, fixture.label))} · {fmtShortDate(date, lang)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <Crest short={left.short} color={left.color} size={56} />
            <span className="line-clamp-2 text-xs font-bold">{left.name}</span>
          </div>
          <div className="font-display text-3xl font-extrabold text-zinc-600">VS</div>
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <Crest short={right.short} color={right.color} size={56} />
            <span className="line-clamp-2 text-xs font-bold">{right.name}</span>
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-crimson-500/30 bg-crimson-500/[0.07] p-3.5">
        <span className="mt-0.5 flex h-8 w-6 shrink-0 items-center justify-center rounded-[3px] bg-crimson-500 shadow-[0_0_14px_rgba(239,68,68,0.5)]" aria-hidden />
        <div className="text-[13px] leading-snug">
          <b className="text-crimson-400">{t('You are banned for this match after your red card.')}</b>
          <p className="mt-1 text-zinc-400">{t('{n} match(es) of suspension left, this one included.', { n: matchesLeft })}</p>
        </div>
      </div>

      <Button block size="lg" onClick={onSitOut}>
        <Armchair className="h-5 w-5" /> {t('Watch from the stands')}
      </Button>
      <p className="text-center text-[11px] text-zinc-500">{t('The team plays without you: no appearance, no rating, no life spent.')}</p>
    </div>
  );
}
