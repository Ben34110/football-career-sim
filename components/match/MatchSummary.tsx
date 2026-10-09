'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Coins, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { AttributeBars, RepBars } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { fmtMoneyK, ovrOf } from '@/lib/engine/player';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import type { Attributes, Expectation, Fixture, FixtureResult, Reputation } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { TeamBadge } from './LiveMatch';

export interface Snapshot {
  rep: Reputation;
  attrs: Attributes;
  money: number;
  ovr: number;
}

export interface ExpectationOutcome {
  expectation: Expectation;
  target: number;
  met: boolean;
  text: string;
}

export function MatchSummary({
  fixture,
  result,
  me,
  opp,
  snap,
  expectation,
  clutch,
  seasonDone,
  onContinue,
}: {
  fixture: Fixture;
  result: FixtureResult;
  me: TeamBadge;
  opp: TeamBadge;
  snap: Snapshot;
  expectation: ExpectationOutcome;
  clutch: { wins: number; total: number };
  seasonDone: boolean;
  onContinue: () => void;
}) {
  const t = useT();
  const player = useGameStore((s) => s.player);
  if (!player) return null;

  const repDelta = Object.fromEntries(
    (Object.keys(player.rep) as (keyof Reputation)[]).map((k) => [k, player.rep[k] - snap.rep[k]]),
  ) as Partial<Reputation>;
  const attrDelta = Object.fromEntries(
    (Object.keys(player.attrs) as (keyof Attributes)[]).map((k) => [k, player.attrs[k] - snap.attrs[k]]),
  ) as Partial<Attributes>;
  const ovr = ovrOf(player);
  const earned = player.money - snap.money;
  const tone = result.outcome === 'W' ? 'text-neon-300' : result.outcome === 'L' ? 'text-crimson-400' : 'text-gold-300';
  const ratingColor = result.rating >= 8 ? '#34d399' : result.rating >= 6.5 ? '#f2c14e' : '#fb4b5e';
  const circ = 2 * Math.PI * 34;

  return (
    <div className="space-y-4">
      <Card strong gold className="p-5 text-center">
        <div className="eyebrow">{t(fixture.label)} · {t('Full time')}</div>
        <div className="mt-3 flex items-center justify-between">
          <Crest short={me.short} color={me.color} size={44} />
          <div>
            <div className="font-num text-5xl font-extrabold leading-none">
              {result.myScore}
              <span className="mx-2 text-zinc-600">–</span>
              {result.oppScore}
            </div>
            {result.shootout && (
              <div className="mt-1 text-xs font-semibold text-gold-300">
                {t('Pens')} {result.shootout.my}–{result.shootout.opp}
              </div>
            )}
          </div>
          <Crest short={opp.short} color={opp.color} size={44} />
        </div>
        <div className={cn('mt-3 font-display text-2xl font-extrabold uppercase', tone)}>
          {result.outcome === 'W' ? t('Victory') : result.outcome === 'L' ? t('Defeat') : t('Draw')}
        </div>
      </Card>

      {(result.benched || result.subbedOff) && (
        <div className="flex flex-wrap gap-2">
          {result.benched && <Chip tone="gold">{t('Started on the bench')}</Chip>}
          {result.subbedOff && <Chip tone="bad">{t('Substituted by the coach')}</Chip>}
        </div>
      )}

      {/* Rating */}
      <Card className="flex items-center gap-4 p-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="-rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <motion.circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={ratingColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - result.rating / 10) }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 6px ${ratingColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-num text-2xl font-extrabold">{result.rating.toFixed(1)}</div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          <Stat label={t('Goals')} value={result.goals} />
          <Stat label={t('Assists')} value={result.assists} />
          <Stat label={t('Clutch')} value={`${clutch.wins}/${clutch.total}`} />
        </div>
      </Card>

      {/* Expectation */}
      <Card className={cn('flex items-start gap-3 p-4', expectation.met ? 'border-neon-400/30' : 'border-crimson-500/30')}>
        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', expectation.met ? 'bg-neon-400/15 text-neon-300' : 'bg-crimson-500/15 text-crimson-400')}>
          {expectation.met ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>
        <div>
          <div className="text-sm font-bold">
            {t(expectation.met ? '{e} expectation met' : '{e} expectation missed', { e: t(expectation.expectation) })}
          </div>
          <p className="text-xs text-zinc-400">{t(expectation.text)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {t('Needed {a} · you scored {b}', { a: expectation.target.toFixed(1), b: result.rating.toFixed(1) })}
          </p>
        </div>
      </Card>

      <div>
        <SectionTitle>{t('Reputation')}</SectionTitle>
        <Card className="p-4">
          <RepBars rep={player.rep} deltas={repDelta} compact />
        </Card>
      </div>

      {Object.values(attrDelta).some((v) => v) && (
        <div>
          <SectionTitle right={<Chip tone="good">OVR {snap.ovr} → {ovr}</Chip>}>{t('Growth')}</SectionTitle>
          <Card className="p-4">
            <AttributeBars attrs={player.attrs} deltas={attrDelta} />
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-gold-400" /> {t('Earned')} {fmtMoneyK(earned)}</span>
        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-gold-400" /> {t('Form')} {player.form.map((f) => f.toFixed(1)).join(' · ')}</span>
      </div>

      <FloatingAction>
        <Button block size="lg" variant={seasonDone ? 'gold' : 'primary'} onClick={onContinue}>
          {seasonDone ? t('Season review') : t('Back to hub')} <ArrowRight className="h-5 w-5" />
        </Button>
      </FloatingAction>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-black/30 py-2">
      <div className="font-num text-2xl font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
