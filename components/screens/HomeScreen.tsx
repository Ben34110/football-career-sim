'use client';

import { motion } from 'framer-motion';
import { ChevronRight, HeartPulse, Newspaper, Play, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';
import { AttributeBars, RepBars } from '@/components/ui/Bars';
import { Bolts } from '@/components/ui/Bolts';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { LangToggle } from '@/components/ui/LangToggle';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { getClub } from '@/lib/data/clubs';
import { ATTR_KEYS, ATTR_LABEL, fmtMoneyK, nextNationalGoal, ovrOf } from '@/lib/engine/player';
import { currentFixture, leaguePosition, leagueZone } from '@/lib/engine/season';
import { useEnergy } from '@/lib/hooks';
import { fixtureDate, fmtGameDate, fmtShortDate, gameDate } from '@/lib/dates';
import { ordinalOf, useLang, useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { cn, crestShort, fmtCountdown } from '@/lib/utils';
import { CareerEnd } from './CareerEnd';
import { SeasonEnd } from './SeasonEnd';

const TONE: Record<string, string> = { good: 'bg-neon-400', bad: 'bg-crimson-500', gold: 'bg-gold-400', neutral: 'bg-zinc-500' };

export function HomeScreen() {
  const t = useT();
  const { lang } = useLang();
  const player = useGameStore((s) => s.player);
  const season = useGameStore((s) => s.season);
  const phase = useGameStore((s) => s.phase);
  const year = useGameStore((s) => s.year);
  const news = useGameStore((s) => s.news);
  const physio = useGameStore((s) => s.physio);
  const { bolts, msToNext } = useEnergy();
  if (!player) return null;

  if (phase === 'retired') return <CareerEnd />;
  const ovr = ovrOf(player);
  const club = getClub(player.clubId);
  const fixture = season && phase === 'playing' ? currentFixture(season) : null;
  const pos = season ? leaguePosition(season) : 0;
  const avg = season && season.stats.apps ? season.stats.ratingSum / season.stats.apps : 0;

  const fixtureIdx = season && fixture ? season.fixtures.findIndex((f) => f.id === fixture.id) : -1;

  return (
    <div className="space-y-5">
      <div className="-mb-2 flex items-center justify-between px-1">
        <span className="eyebrow capitalize">{fmtGameDate(gameDate(season, year), lang)}</span>
        <LangToggle />
      </div>
      {phase === 'season-end' && <SeasonEnd />}

      {phase === 'free-agent' && (
        <Card gold className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-400/15 text-xl">✍️</div>
            <div className="flex-1">
              <div className="text-sm font-bold">{t('You’re a free agent')}</div>
              <div className="text-xs text-zinc-400">{t('Choose your next club to start the season.')}</div>
            </div>
            <Link href="/transfers">
              <Button size="sm" variant="gold">
                {t('Offers')}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <PlayerCard name={player.name} nationality={player.nationality} position={player.position} attrs={player.attrs} xp={player.xp} age={player.age} clubId={player.clubId} look={player.look} />

      {/* Next fixture */}
      {fixture && (
        <div>
          <SectionTitle right={<Bolts bolts={bolts} msToNext={msToNext} showTimer size="sm" />}>{t('Next fixture')}</SectionTitle>
          <Card strong className="overflow-hidden p-4">
            <div className="flex items-center justify-between">
              <Chip tone={fixture.kind === 'league' ? 'neutral' : 'gold'}>{t(fixture.kind === 'league' ? 'League' : fixture.kind === 'cup' ? 'Cup' : fixture.kind === 'euro' ? 'Europe' : fixture.kind === 'intl' ? 'International' : 'Tournament')}</Chip>
              <span className="eyebrow">{t(fixture.label)}{season && fixtureIdx >= 0 ? ` · ${fmtShortDate(fixtureDate(season, fixtureIdx), lang)}` : ''}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              {club && <Crest short={club.short} color={club.color} size={44} />}
              <div className="flex-1 text-center">
                <div className="font-display text-xl font-extrabold text-zinc-600">VS</div>
                <div className="text-[11px] text-zinc-500">{fixture.home ? t('Home') : t('Away')}</div>
              </div>
              {fixture.drawn === false ? (
                <div className="flex items-center justify-end gap-3 text-right">
                  <div>
                    <div className="text-sm font-bold leading-tight">{t('Opponent to be drawn')}</div>
                    <div className="text-[11px] text-zinc-500">{t('You take part in the draw')}</div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/40 bg-gold-400/10 text-xl">🎱</div>
                </div>
              ) : (
              <div className="text-right">
                <div className="flex items-center justify-end gap-3">
                  <div>
                    <div className="text-sm font-bold leading-tight">{t(fixture.opponent)}</div>
                    <div className="text-[11px] text-zinc-500">{t('Squad')} {fixture.opponentStrength}</div>
                  </div>
                  <Crest short={crestShort(fixture.opponentShort)} color={fixture.opponentColor} size={44} />
                </div>
              </div>
              )}
            </div>
            <Link href="/match" className="mt-4 block">
              <Button block size="lg">
                <Play className="h-5 w-5 fill-current" />
                {fixture.drawn === false ? t('Take part in the draw') : bolts < 1 ? t('Exhausted · {time}', { time: fmtCountdown(msToNext) }) : t('Go to match day')}
              </Button>
            </Link>
          </Card>
        </div>
      )}

      {/* Recovery: money buys lives back; attributes only grow by playing well */}
      {season && phase === 'playing' && (
        <Card className="space-y-2.5 p-3.5">
          <Button
            block
            variant="ghost"
            size="sm"
            onClick={() => {
              const r = physio();
              toast(r.msg, r.ok ? 'good' : 'bad');
            }}
          >
            <HeartPulse className="h-4 w-4 text-crimson-400" /> {t('Recovery clinic · +2 lives')} ({fmtMoneyK((player.contract?.wage ?? 0) * 3)})
          </Button>
          <p className="px-1 text-[11px] leading-snug text-zinc-500">{t('Your attributes grow by playing well: goals, assists, high ratings and winning decisions.')}</p>
        </Card>
      )}

      {/* Season snapshot */}
      {season && (
        <div>
          <SectionTitle right={<Link href="/calendar" className="flex items-center text-[11px] font-semibold text-neon-400">{t('Full season')} <ChevronRight className="h-3 w-3" /></Link>}>{t('This season')}</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            <Tile label={t('League|tile')} value={ordinalOf(pos, lang)} />
            <Tile label={t('Apps')} value={season.stats.apps} />
            <Tile label="GA" value={season.stats.goals + season.stats.assists} />
            <Tile label={t('Avg')} value={avg ? avg.toFixed(1) : '–'} />
          </div>
          {season && (() => {
            const z = leagueZone(pos, season.division ?? 1, season.table.length);
            const label = z === 'champions' ? 'Champions League place' : z === 'europa' ? 'Europa League place' : z === 'promoted' ? 'Promotion place' : z === 'relegated' ? 'Relegation zone' : null;
            return label ? (
              <p className={cn('mt-2.5 rounded-xl px-3 py-2 text-xs font-semibold', z === 'relegated' ? 'bg-crimson-500/10 text-crimson-400' : z === 'promoted' ? 'bg-neon-400/10 text-neon-300' : 'bg-sky-400/10 text-sky-300')}>
                {z === 'relegated' ? '⬇️' : z === 'promoted' ? '⬆️' : '⭐'} {t(label)}
              </p>
            ) : null;
          })()}
          {(() => {
            const goal = nextNationalGoal(ovr, player.age);
            return goal ? (
              <p className="mt-2.5 flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
                <Trophy className="h-3 w-3 text-gold-400" />{' '}
                {t('Reach OVR {n} for a {level} call-up ({m} to go).', { n: goal.ovr, m: goal.ovr - ovr, level: goal.level === 'A' ? t('national team') : goal.level })}
              </p>
            ) : null;
          })()}
        </div>
      )}

      <div>
        <SectionTitle>{t('Reputation')}</SectionTitle>
        <Card className="p-4">
          <RepBars rep={player.rep} />
          {(player.strikes ?? 0) > 0 && (
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-crimson-500/10 px-3 py-2 text-xs font-semibold text-crimson-400">
              {t('Scandal strikes')} {player.strikes}/3 — {t('3 strikes and the club cuts you loose.')}
            </p>
          )}
        </Card>
      </div>

      <div>
        <SectionTitle>{t('Attributes')}</SectionTitle>
        <Card className="p-4">
          <AttributeBars attrs={player.attrs} xp={player.xp} />
        </Card>
      </div>

      {news.length > 0 && (
        <div>
          <SectionTitle right={<Newspaper className="h-3.5 w-3.5 text-zinc-600" />}>{t('News')}</SectionTitle>
          <Card className="divide-y divide-white/[0.06]">
            {news.slice(0, 6).map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 text-[13px] leading-snug text-zinc-300">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', TONE[n.tone])} />
                {t(n.text)}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass gloss-edge px-2 py-3 text-center">
      <div className="font-num text-2xl font-extrabold leading-none">{value}</div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
