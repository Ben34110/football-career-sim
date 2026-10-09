'use client';

import { motion } from 'framer-motion';
import { Check, CircleDot, Flag, Globe, Lock, Minus, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { getClub } from '@/lib/data/clubs';
import { getNationality, tournamentFor } from '@/lib/data/nationalities';
import { CALL_UP_OVR, ovrOf, seasonLabel } from '@/lib/engine/player';
import { sortTable } from '@/lib/engine/season';
import { fixtureDate, fmtShortDate } from '@/lib/dates';
import { ordinalOf, useLang, useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import type { SeasonState } from '@/lib/types';
import { cn, crestShort } from '@/lib/utils';

const KIND_ICON = { league: CircleDot, cup: Trophy, intl: Flag, tournament: Globe };
const TABS = ['Fixtures', 'Table', 'History'] as const;

export function CalendarScreen() {
  const t = useT();
  const { lang } = useLang();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Fixtures');
  const player = useGameStore((s) => s.player);
  const season = useGameStore((s) => s.season);
  const history = useGameStore((s) => s.history);
  const year = useGameStore((s) => s.year);
  if (!player) return null;

  const ovr = ovrOf(player);
  const nat = getNationality(player.nationality);
  const nextTournament = tournamentFor(year + 1, nat);
  const upcoming = [1, 2, 3, 4, 5]
    .map((d) => ({ y: year + d, name: tournamentFor(year + d, nat) }))
    .filter((x): x is { y: number; name: string } => !!x.name)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow">{t('Season')}</div>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{seasonLabel(year)}</h1>
      </div>

      {/* National team status */}
      <Card gold={ovr >= CALL_UP_OVR} className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-2xl">{nat.flag}</div>
          <div className="flex-1">
            <div className="text-sm font-bold">{ovr >= CALL_UP_OVR ? t('{team} national team', { team: t(nat.name) }) : t('National team call-ups')}</div>
            {ovr >= CALL_UP_OVR ? (
              <div className="text-xs text-zinc-400">
                {season?.tournamentQueued ? t('Playing: {name}', { name: t(season.tournamentName ?? '') }) : nextTournament ? t('Eligible for the {name} this summer', { name: t(nextTournament) }) : t('No major tournament this summer')}
              </div>
            ) : (
              <div className="text-xs text-zinc-400">{t('Requires OVR {n}+ · you’re {m}', { n: CALL_UP_OVR, m: ovr })}</div>
            )}
          </div>
          {ovr >= CALL_UP_OVR ? <Chip tone="gold">{t('Called up')}</Chip> : <Lock className="h-4 w-4 text-zinc-600" />}
        </div>
        {ovr >= CALL_UP_OVR && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-black/30 py-2">
              <div className="font-num text-xl font-extrabold">{player.national?.caps ?? 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Caps')}</div>
            </div>
            <div className="rounded-xl bg-black/30 py-2">
              <div className="font-num text-xl font-extrabold">{player.national?.goals ?? 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('International goals')}</div>
            </div>
          </div>
        )}
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <div className="eyebrow mb-2">{t('Next major tournaments')}</div>
          <div className="flex flex-wrap gap-1.5">
            {upcoming.map((u) => (
              <Chip key={`${u.name}-${u.y}`} tone={u.name === 'FIFA World Cup' ? 'gold' : 'neutral'}>
                🏆 {t(u.name)} {u.y}
              </Chip>
            ))}
          </div>
        </div>
        {ovr < CALL_UP_OVR && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-200" animate={{ width: `${Math.min(100, ((ovr - 55) / (CALL_UP_OVR - 55)) * 100)}%` }} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1" role="tablist">
        {TABS.map((tb) => (
          <button
            key={tb}
            role="tab"
            aria-selected={tab === tb}
            onClick={() => setTab(tb)}
            className={cn('relative h-10 rounded-xl text-sm font-bold transition-colors', tab === tb ? 'text-zinc-950' : 'text-zinc-400')}
          >
            {tab === tb && <motion.span layoutId="cal-tab" className="absolute inset-0 rounded-xl bg-gradient-to-b from-neon-400 to-neon-600" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative">{t(tb)}</span>
          </button>
        ))}
      </div>

      {tab === 'Fixtures' && (season ? <Fixtures season={season} /> : <Empty text={t('No active season — sign a club first.')} />)}
      {tab === 'Table' && (season ? <Table /> : <Empty text={t('No active season.')} />)}
      {tab === 'History' && (
        <div className="space-y-2.5">
          {history.length === 0 && <Empty text={t('Your career history will appear here after your first season.')} />}
          {[...history].reverse().map((r) => {
            const c = getClub(r.clubId);
            return (
              <Card key={r.year} className="flex items-center gap-3 p-3.5">
                {c && <Crest short={c.short} color={c.color} size={38} />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{seasonLabel(r.year)} · {c?.name}</div>
                  <div className="text-xs text-zinc-500">
                    {r.apps} {t('apps')} · {r.goals}G {r.assists}A · {t('avg')} {r.avgRating || '–'} · {ordinalOf(r.leaguePos, lang)}
                  </div>
                  {r.trophies.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.trophies.map((tr) => <Chip key={tr} tone="gold">🏆 {t(tr)}</Chip>)}</div>}
                </div>
                <div className="font-num text-2xl font-extrabold text-gold-300">{r.ovr}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Fixtures({ season }: { season: SeasonState }) {
  const t = useT();
  const { lang } = useLang();
  const { fixtures, cursor } = season;
  return (
    <ol className="relative space-y-2 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-white/10">
      {fixtures.map((f, i) => {
        const Icon = KIND_ICON[f.kind];
        const next = i === cursor;
        const r = f.result;
        return (
          <li key={f.id} className={cn('relative flex items-center gap-3 rounded-2xl border p-3 pl-3', next ? 'gloss-edge border-neon-400/40 bg-neon-400/[0.07]' : 'border-white/[0.06] bg-white/[0.03]', f.status === 'skipped' && 'opacity-40')}>
            <div className={cn('relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', next ? 'border-neon-400/60 bg-zinc-950 text-neon-300' : 'border-white/10 bg-zinc-900 text-zinc-500')}>
              <Icon className="h-4 w-4" />
            </div>
            <Crest short={crestShort(f.opponentShort)} color={f.opponentColor} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{t(f.opponent)}</div>
              <div className="text-[11px] text-zinc-500">
                {fmtShortDate(fixtureDate(season, i), lang)} · {t(f.label)} · {f.home ? t('H') : t('A')} · {f.opponentStrength}
              </div>
            </div>
            {f.status === 'played' && r && (
              <div className="flex items-center gap-2">
                <span className="font-num text-sm font-bold">
                  {r.myScore}–{r.oppScore}
                  {r.shootout ? <span className="text-[10px] text-gold-300"> ({r.shootout.my}–{r.shootout.opp})</span> : null}
                </span>
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', r.outcome === 'W' ? 'bg-neon-500/20 text-neon-300' : r.outcome === 'L' ? 'bg-crimson-500/20 text-crimson-400' : 'bg-gold-400/20 text-gold-300')}>
                  {r.outcome === 'W' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : r.outcome === 'L' ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : <Minus className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </div>
            )}
            {f.status === 'upcoming' && next && <Chip tone="good">{t('Next')}</Chip>}
            {f.status === 'skipped' && <Chip>{t('Out')}</Chip>}
          </li>
        );
      })}
    </ol>
  );
}

function Table() {
  const t = useT();
  const season = useGameStore((s) => s.season);
  if (!season) return null;
  const rows = sortTable(season.table);
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-[24px_1fr_28px_28px_28px_36px_34px] items-center gap-1 border-b border-white/[0.06] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        <span>#</span>
        <span>{t('Club')}</span>
        <span className="text-center">{t('P')}</span>
        <span className="text-center">{t('W')}</span>
        <span className="text-center">{t('D')}</span>
        <span className="text-center">{t('GD')}</span>
        <span className="text-right">{t('Pts')}</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            'grid grid-cols-[24px_1fr_28px_28px_28px_36px_34px] items-center gap-1 px-3 py-2.5 text-[13px]',
            r.isMe ? 'bg-neon-400/10 font-bold text-neon-300' : 'border-t border-white/[0.04] text-zinc-300',
            i === 0 && 'shadow-[inset_3px_0_0_#f2c14e]',
          )}
        >
          <span className="font-num text-zinc-500">{i + 1}</span>
          <span className="truncate">{r.name}</span>
          <span className="font-num text-center">{r.played}</span>
          <span className="font-num text-center">{r.won}</span>
          <span className="font-num text-center">{r.drawn}</span>
          <span className="font-num text-center">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</span>
          <span className="font-num text-right text-base font-extrabold">{r.pts}</span>
        </div>
      ))}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="p-6 text-center text-sm text-zinc-500">{text}</Card>;
}
