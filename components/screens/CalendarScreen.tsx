'use client';

import { motion } from 'framer-motion';
import { Check, CircleDot, Flag, Globe, Lock, Minus, Star, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { getClub } from '@/lib/data/clubs';
import { getNationality, tournamentFor, youthTournamentFor } from '@/lib/data/nationalities';
import { CALL_UP_OVR, nationalLevel, nextNationalGoal, ovrOf, seasonLabel, U20_CALL_UP_OVR, U23_CALL_UP_OVR } from '@/lib/engine/player';
import { seasonZones, sortTable } from '@/lib/engine/season';
import { fixtureDate, fmtShortDate } from '@/lib/dates';
import { ordinalOf, useLang, useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import type { Fixture, SeasonState } from '@/lib/types';
import { cn, crestShort } from '@/lib/utils';

const KIND_ICON = { league: CircleDot, cup: Trophy, intl: Flag, tournament: Globe, euro: Star };
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
  const level = nationalLevel(ovr, player.age);
  const goal = nextNationalGoal(ovr, player.age);
  const teamName = `${t(nat.name)}${level && level !== 'A' ? ' ' + level : ''}`;
  const nextTournament = level === 'A' || !level ? tournamentFor(year + 1, nat) : youthTournamentFor(level, year + 1, nat);
  const upcoming = [1, 2, 3, 4, 5]
    .map((d) => ({ y: year + d, name: level && level !== 'A' ? youthTournamentFor(level, year + d, nat) : tournamentFor(year + d, nat) }))
    .filter((x): x is { y: number; name: string } => !!x.name)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow">{t('Season')}</div>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{seasonLabel(year)}</h1>
      </div>

      {/* National team status */}
      <Card gold={!!level} className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-2xl">{nat.flag}</div>
          <div className="flex-1">
            <div className="text-sm font-bold">{level ? t('{team} national team', { team: teamName }) : t('National team call-ups')}</div>
            {level ? (
              <div className="text-xs text-zinc-400">
                {season?.tournamentQueued ? t('Playing: {name}', { name: t(season.tournamentName ?? '') }) : nextTournament ? t('Eligible for the {name} this summer', { name: t(nextTournament) }) : t('No major tournament this summer')}
              </div>
            ) : (
              <div className="text-xs text-zinc-400">{t('U20 from OVR {a} · U23 from {b} · senior from {c}', { a: U20_CALL_UP_OVR, b: U23_CALL_UP_OVR, c: CALL_UP_OVR })}</div>
            )}
          </div>
          {level ? <Chip tone="gold">{t('Called up')}</Chip> : <Lock className="h-4 w-4 text-zinc-600" />}
        </div>
        {level && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-black/30 py-2">
              <div className="font-num text-xl font-extrabold">{(player.national?.caps ?? 0) + (player.national?.youthCaps ?? 0)}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Caps')}</div>
            </div>
            <div className="rounded-xl bg-black/30 py-2">
              <div className="font-num text-xl font-extrabold">{player.national?.goals ?? 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('International goals')}</div>
            </div>
          </div>
        )}
        {goal && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
              <span>{t('Next: {level} call-up', { level: goal.level === 'A' ? t('senior') : goal.level })}</span>
              <span className="font-num font-semibold text-zinc-200">
                {ovr} / {goal.ovr}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-200" animate={{ width: `${Math.min(100, ((ovr - 55) / (goal.ovr - 55)) * 100)}%` }} />
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <div className="eyebrow mb-2">{t('Next major tournaments')}</div>
            <div className="flex flex-wrap gap-1.5">
              {upcoming.map((u) => (
                <Chip key={`${u.name}-${u.y}`} tone={u.name.includes('World Cup') ? 'gold' : 'neutral'}>
                  🏆 {t(u.name)} {u.y}
                </Chip>
              ))}
            </div>
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
  // Later cup rounds / tournament stages stay hidden until the previous round is won
  const firstOpen: Partial<Record<Fixture['kind'], string>> = {};
  for (const f of fixtures) if (f.status === 'upcoming' && f.drawn === false && !firstOpen[f.kind]) firstOpen[f.kind] = f.id;
  const groupLeft = fixtures.some((x) => x.kind === 'euro' && x.status === 'upcoming' && x.drawn !== false);
  const visible = fixtures
    .map((f, i) => ({ f, i }))
    // later knockout rounds stay hidden until you reach them (European knockouts also wait for the group stage)
    .filter(({ f }) => !(f.status === 'upcoming' && f.drawn === false && (firstOpen[f.kind] !== f.id || (f.kind === 'euro' && groupLeft))));
  return (
    <ol className="relative space-y-2 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-white/10">
      {visible.map(({ f, i }) => {
        const pending = f.drawn === false;
        const Icon = KIND_ICON[f.kind];
        const next = i === cursor;
        const r = f.result;
        return (
          <li key={f.id} className={cn('relative flex items-center gap-3 rounded-2xl border p-3 pl-3', next ? 'gloss-edge border-neon-400/40 bg-neon-400/[0.07]' : 'border-white/[0.06] bg-white/[0.03]', f.status === 'skipped' && 'opacity-40')}>
            <div className={cn('relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', next ? 'border-neon-400/60 bg-zinc-950 text-neon-300' : 'border-white/10 bg-zinc-900 text-zinc-500')}>
              <Icon className="h-4 w-4" />
            </div>
            {pending ? <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-gold-400/40 bg-gold-400/10 text-sm">🎱</span> : <Crest short={crestShort(f.opponentShort)} color={f.opponentColor} size={30} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{pending ? t('Opponent to be drawn') : t(f.opponent)}</div>
              <div className="text-[11px] text-zinc-500">
                {fmtShortDate(fixtureDate(season, i), lang)} · {t(f.label)}{pending ? '' : ` · ${f.home ? t('H') : t('A')} · ${f.opponentStrength}`}
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
  const [view, setView] = useState<'league' | 'europe'>('league');
  if (!season) return null;
  const hasEurope = !!season.europe && !!season.euroTable;
  if (hasEurope && view === 'europe') {
    return (
      <div className="space-y-2.5">
        <ViewSwitch view={view} onChange={setView} europe={season.europe!} />
        <EuropeTable season={season} />
      </div>
    );
  }
  const rows = sortTable(season.table);
  const z = seasonZones(season);
  const div = season.division ?? 1;
  const total = rows.length;
  /** Colour of the left edge: Europe, promotion, relegation */
  const zoneOf = (i: number) => {
    if (i < z.champions) return { bar: '#38bdf8', key: 'champions' as const };
    if (i < z.champions + z.europa) return { bar: '#f97316', key: 'europa' as const };
    if (i < z.promo) return { bar: '#34d399', key: 'promo' as const };
    if (z.relegation > 0 && i >= total - z.relegation) return { bar: '#ef4444', key: 'relegation' as const };
    return null;
  };
  return (
    <div className="space-y-2.5">
      {hasEurope ? (
        <ViewSwitch view={view} onChange={setView} europe={season.europe!} />
      ) : (
        <div className="px-1 text-[11px] font-semibold text-zinc-500">
          {t('Division {n}', { n: div })}
          {season.europe ? ` · ${t(season.europe)}` : ''}
        </div>
      )}
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
        {rows.map((r, i) => {
          const zone = zoneOf(i);
          return (
            <div
              key={r.id}
              style={zone ? { boxShadow: `inset 3px 0 0 ${zone.bar}` } : undefined}
              className={cn(
                'grid grid-cols-[24px_1fr_28px_28px_28px_36px_34px] items-center gap-1 px-3 py-2.5 text-[13px]',
                r.isMe ? 'bg-neon-400/10 font-bold text-neon-300' : 'border-t border-white/[0.04] text-zinc-300',
                zone?.key === 'relegation' && !r.isMe && 'bg-crimson-500/[0.06]',
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
          );
        })}
      </Card>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px] text-zinc-400">
        {z.champions > 0 && <Legend color="#38bdf8" label={t('Champions League')} />}
        {z.europa > 0 && <Legend color="#f97316" label={t('Europa League')} />}
        {z.promo > 0 && <Legend color="#34d399" label={t('Promotion')} />}
        {z.relegation > 0 && <Legend color="#ef4444" label={t('Relegation')} />}
      </div>
    </div>
  );
}

function ViewSwitch({ view, onChange, europe }: { view: 'league' | 'europe'; onChange: (v: 'league' | 'europe') => void; europe: string }) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
      {(['league', 'europe'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={cn('h-9 rounded-lg text-[13px] font-bold transition-colors', view === v ? 'bg-gradient-to-b from-sky-400 to-sky-600 text-zinc-950' : 'text-zinc-400')}
        >
          {v === 'league' ? t('League') : t(europe)}
        </button>
      ))}
    </div>
  );
}

/** The European group (top two go through) and the knockout path. */
function EuropeTable({ season }: { season: SeasonState }) {
  const t = useT();
  const rows = sortTable(season.euroTable ?? []);
  const rounds = season.fixtures.filter((f) => f.kind === 'euro' && f.knockout);
  const groupDone = season.fixtures.filter((f) => f.kind === 'euro' && !f.knockout).every((f) => f.status !== 'upcoming');
  const myRank = rows.findIndex((r) => r.isMe);
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden p-0">
        <div className="eyebrow px-4 pt-3.5">{t('Group stage')}</div>
        <div className="mt-2 grid grid-cols-[20px_1fr_26px_26px_26px_26px_34px] items-center gap-1 border-b border-white/[0.06] px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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
            style={i < 2 ? { boxShadow: 'inset 3px 0 0 #34d399' } : undefined}
            className={cn('grid grid-cols-[20px_1fr_26px_26px_26px_26px_34px] items-center gap-1 px-3 py-2.5 text-[13px]', r.isMe ? 'bg-neon-400/10 font-bold text-neon-300' : 'border-t border-white/[0.04] text-zinc-300')}
          >
            <span className="font-num text-zinc-500">{i + 1}</span>
            <span className="truncate">{t(r.name)}</span>
            <span className="font-num text-center">{r.played}</span>
            <span className="font-num text-center">{r.won}</span>
            <span className="font-num text-center">{r.drawn}</span>
            <span className="font-num text-center">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</span>
            <span className="font-num text-right text-base font-extrabold">{r.pts}</span>
          </div>
        ))}
      </Card>
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-400">
        <span className="h-2.5 w-1 rounded-full bg-neon-400" /> {t('Top two go through to the knockout rounds')}
      </div>
      {groupDone && (
        <p className={cn('rounded-xl px-3 py-2 text-xs font-semibold', myRank < 2 ? 'bg-neon-400/10 text-neon-300' : 'bg-crimson-500/10 text-crimson-400')}>
          {myRank < 2 ? t('You are through to the knockout rounds!') : t('Eliminated in the group stage.')}
        </p>
      )}

      <Card className="p-4">
        <div className="eyebrow mb-2.5">{t('Road to the final')}</div>
        <ol className="space-y-2">
          {rounds.map((f) => {
            const round = f.label.replace(/^(Champions League|Europa League) /, '');
            const r = f.result;
            return (
              <li key={f.id} className={cn('flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px]', f.status === 'skipped' ? 'opacity-40' : 'bg-white/[0.04]')}>
                <span className="font-semibold">{t(round)}</span>
                <span className="min-w-0 truncate text-right text-zinc-400">
                  {f.status === 'played' && r ? (
                    <>
                      {t(f.opponent)} · <b className={cn('font-num', r.outcome === 'W' ? 'text-neon-300' : 'text-crimson-400')}>{r.myScore}–{r.oppScore}</b>
                    </>
                  ) : f.status === 'skipped' ? (
                    t('Not reached')
                  ) : f.drawn === false ? (
                    t('Draw pending')
                  ) : (
                    t(f.opponent)
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-1 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="p-6 text-center text-sm text-zinc-500">{text}</Card>;
}
