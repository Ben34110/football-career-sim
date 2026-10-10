'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Coins, Star, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { AttributeBars, RepBars } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { HeadAvatar } from '@/components/ui/HeadAvatar';
import { DEFAULT_LOOK, randomLook } from '@/lib/data/look';
import type { Motm } from '@/lib/data/motm';
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
  motm,
  clutch,
  seasonDone,
  onContinue,
}: {
  fixture: Fixture;
  result: FixtureResult;
  me: TeamBadge;
  opp: TeamBadge;
  snap: Snapshot;
  /** Kept for the reputation effects; no longer shown */
  expectation?: ExpectationOutcome;
  motm: Motm;
  clutch: { wins: number; total: number };
  seasonDone: boolean;
  onContinue: () => void;
}) {
  const t = useT();
  const player = useGameStore((s) => s.player);
  // a teammate or a rival gets a face of his own, the same every time this screen draws
  const motmLook = useMemo(() => {
    if (motm.you) return player?.look ?? DEFAULT_LOOK;
    let seed = [...motm.name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return randomLook(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296));
  }, [motm.name, motm.you, player?.look]);
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
          <Crest short={(fixture.home ? me : opp).short} color={(fixture.home ? me : opp).color} size={44} />
          <div>
            <div className="font-num text-5xl font-extrabold leading-none">
              {fixture.home ? result.myScore : result.oppScore}
              <span className="mx-2 text-zinc-600">–</span>
              {fixture.home ? result.oppScore : result.myScore}
            </div>
            {result.shootout && (
              <div className="mt-1 text-xs font-semibold text-gold-300">
                {t('Pens')} {fixture.home ? result.shootout.my : result.shootout.opp}–{fixture.home ? result.shootout.opp : result.shootout.my}
              </div>
            )}
          </div>
          <Crest short={(fixture.home ? opp : me).short} color={(fixture.home ? opp : me).color} size={44} />
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

      {/* Man of the match */}
      <Card className={cn('flex items-center gap-3.5 overflow-hidden p-3.5', motm.you ? 'border-gold-300/50 bg-gradient-to-r from-gold-400/20 to-transparent' : 'border-white/10')}>
        <div className="relative shrink-0">
          <HeadAvatar look={motmLook} kit={motm.team === 'me' ? me.color : opp.color} size={64} framed expression={motm.you || motm.team === 'me' ? 'cheer' : 'neutral'} />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-zinc-950 shadow-gold"><Trophy className="h-3.5 w-3.5" /></span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-gold-300">{t('Man of the match')}</div>
          <div className="truncate font-display text-2xl font-extrabold uppercase leading-none">{motm.name}</div>
          <div className="mt-0.5 truncate text-xs text-zinc-400">
            {motm.team === 'me' ? me.name : opp.name}
            {motm.you ? ` · ${t('That’s you!')}` : ''}
          </div>
        </div>
        <div className="font-num text-3xl font-extrabold text-gold-300">{motm.rating.toFixed(1)}</div>
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
