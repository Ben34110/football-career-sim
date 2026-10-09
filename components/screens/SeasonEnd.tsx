'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Repeat, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttributeBars } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { getClub } from '@/lib/data/clubs';
import { seasonLabel } from '@/lib/engine/player';
import { ordinalOf, useLang, useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function SeasonEnd() {
  const t = useT();
  const { lang } = useLang();
  const summary = useGameStore((s) => s.lastSummary);
  const player = useGameStore((s) => s.player);
  const pendingMove = useGameStore((s) => s.pendingMove);
  const startNext = useGameStore((s) => s.startNextSeason);
  const router = useRouter();
  if (!summary || !player) return null;
  const { record: r, table } = summary;
  const move = pendingMove ? getClub(pendingMove.clubId) : null;
  const up = summary.ovrAfter - summary.ovrBefore;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
      <Card strong gold className="p-5 text-center">
        <div className="eyebrow text-gold-300">{t('Season review')}</div>
        <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none">{t('{s} Complete', { s: seasonLabel(r.year) })}</h2>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Mini label={t('League')} value={ordinalOf(r.leaguePos, lang)} />
          <Mini label={t('Apps')} value={r.apps} />
          <Mini label="G + A" value={`${r.goals}+${r.assists}`} />
          <Mini label={t('Avg')} value={r.avgRating ? r.avgRating.toFixed(1) : '–'} />
        </div>
        {r.trophies.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {r.trophies.map((tr) => (
              <Chip key={tr} tone="gold">
                <Trophy className="h-3 w-3" /> {t(tr)}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      {summary.ballonDor && <BallonDorCard result={summary.ballonDor} />}

      <div>
        <SectionTitle right={<Chip tone={up > 0 ? 'good' : up < 0 ? 'bad' : 'neutral'}>OVR {summary.ovrBefore} → {summary.ovrAfter}</Chip>}>{t('Development · age {n}', { n: player.age })}</SectionTitle>
        <Card className="p-4">
          <AttributeBars attrs={player.attrs} deltas={summary.delta} />
        </Card>
      </div>

      <Card className="p-0">
        <div className="eyebrow px-4 pt-3.5">{t('Final table')}</div>
        <div className="mt-2 divide-y divide-white/[0.05]">
          {table.slice(0, 5).map((row, i) => (
            <div key={row.id} className={cn('flex items-center gap-3 px-4 py-2 text-[13px]', row.isMe && 'bg-neon-400/10 font-bold text-neon-300')}>
              <span className="font-num w-4 text-zinc-500">{i + 1}</span>
              <span className="flex-1 truncate">{row.name}</span>
              <span className="font-num font-bold">{row.pts}</span>
            </div>
          ))}
        </div>
      </Card>

      {summary.contractExpiring && (
        <Card className="border-gold-400/30 p-4 text-sm">
          <b className="text-gold-300">{t('Contract expiring.')}</b>{' '}
          <span className="text-zinc-400">
            {player.rep.coachTrust >= 35 ? t('Your club will offer an extension if you stay.') : t('Coach Trust is low — you may be released. Check the market.')}
          </span>
        </Card>
      )}
      {move && (
        <Card gold className="flex items-center gap-3 p-4 text-sm">
          <Repeat className="h-4 w-4 text-gold-300" />
          <span>
            {pendingMove?.source === 'renewal' ? t('New deal agreed with') : t('Pre-agreed move to')} <b>{move.name}</b>.
          </span>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" size="lg" onClick={() => router.push('/transfers')}>
          <Repeat className="h-4 w-4" /> {t('Transfers')}
        </Button>
        <Button
          size="lg"
          variant="gold"
          onClick={() => {
            startNext();
          }}
        >
          {summary.retiring ? t('Retire') : t('Next season')} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <Link href="/profile" className="block text-center text-xs font-semibold text-zinc-500">
        {t('View career history')}
      </Link>
    </motion.div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-black/30 py-2.5">
      <div className="font-num text-xl font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function BallonDorCard({ result }: { result: NonNullable<ReturnType<typeof useGameStore.getState>['lastSummary']>['ballonDor'] }) {
  const t = useT();
  const { lang } = useLang();
  if (!result) return null;
  const top = result.ranking.slice(0, 5);
  const me = result.ranking[result.rank - 1];
  const rows = result.rank <= 5 ? top : [...top, me];
  return (
    <Card gold className="overflow-hidden p-0">
      <div className="bg-gradient-to-b from-gold-300/25 to-transparent px-4 py-3.5 text-center">
        <div className="text-3xl">{result.won ? '🏆' : '🥇'}</div>
        <div className="font-display text-2xl font-extrabold uppercase leading-none text-gold-200">{t('Ballon d’Or')}</div>
        <p className="mt-1 text-xs text-zinc-300">
          {result.won ? t('You won the Ballon d’Or!') : t('You finished {rank} in the vote.', { rank: ordinalOf(result.rank, lang) })}
        </p>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {rows.map((e) => (
          <div key={`${e.name}-${e.score}`} className={cn('flex items-center gap-3 px-4 py-2 text-[13px]', e.isMe && 'bg-gold-400/10 font-bold text-gold-200')}>
            <span className="font-num w-5 text-zinc-500">{result.ranking.indexOf(e) + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {e.name} <span className="text-[11px] font-normal text-zinc-500">· {e.club}</span>
            </span>
            <span className="font-num font-bold">{e.score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
