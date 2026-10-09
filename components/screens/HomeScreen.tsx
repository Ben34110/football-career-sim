'use client';

import { motion } from 'framer-motion';
import { ChevronRight, HeartPulse, Newspaper, Play, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';
import { AttributeBars, RepBars } from '@/components/ui/Bars';
import { Bolts } from '@/components/ui/Bolts';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { getClub } from '@/lib/data/clubs';
import { ATTR_KEYS, ATTR_LABEL, CALL_UP_OVR, fmtMoneyK, ovrOf } from '@/lib/engine/player';
import { currentFixture, leaguePosition } from '@/lib/engine/season';
import { useEnergy } from '@/lib/hooks';
import { MAX_TRAININGS_PER_FIXTURE, ordinal, useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { cn, crestShort, fmtCountdown } from '@/lib/utils';
import { CareerEnd } from './CareerEnd';
import { SeasonEnd } from './SeasonEnd';

const TONE: Record<string, string> = { good: 'bg-neon-400', bad: 'bg-crimson-500', gold: 'bg-gold-400', neutral: 'bg-zinc-500' };

export function HomeScreen() {
  const player = useGameStore((s) => s.player);
  const season = useGameStore((s) => s.season);
  const phase = useGameStore((s) => s.phase);
  const news = useGameStore((s) => s.news);
  const train = useGameStore((s) => s.train);
  const physio = useGameStore((s) => s.physio);
  const { bolts, msToNext } = useEnergy();
  if (!player) return null;

  if (phase === 'retired') return <CareerEnd />;
  const ovr = ovrOf(player);
  const club = getClub(player.clubId);
  const fixture = season && phase === 'playing' ? currentFixture(season) : null;
  const used = season && season.training.cursor === season.cursor ? season.training.count : 0;
  const pos = season ? leaguePosition(season) : 0;
  const avg = season && season.stats.apps ? season.stats.ratingSum / season.stats.apps : 0;

  const doTrain = (k: (typeof ATTR_KEYS)[number]) => {
    const r = train(k);
    toast(r.msg, r.ok ? 'good' : 'bad');
  };

  return (
    <div className="space-y-5">
      {phase === 'season-end' && <SeasonEnd />}

      {phase === 'free-agent' && (
        <Card gold className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-400/15 text-xl">✍️</div>
            <div className="flex-1">
              <div className="text-sm font-bold">You’re a free agent</div>
              <div className="text-xs text-zinc-400">Choose your next club to start the season.</div>
            </div>
            <Link href="/transfers">
              <Button size="sm" variant="gold">
                Offers
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <PlayerCard name={player.name} nationality={player.nationality} position={player.position} attrs={player.attrs} age={player.age} clubId={player.clubId} />

      {/* Next fixture */}
      {fixture && (
        <div>
          <SectionTitle right={<Bolts bolts={bolts} msToNext={msToNext} showTimer size="sm" />}>Next fixture</SectionTitle>
          <Card strong className="overflow-hidden p-4">
            <div className="flex items-center justify-between">
              <Chip tone={fixture.kind === 'league' ? 'neutral' : 'gold'}>{fixture.kind === 'league' ? 'League' : fixture.kind === 'cup' ? 'Cup' : fixture.kind === 'intl' ? 'International' : 'Tournament'}</Chip>
              <span className="eyebrow">{fixture.label}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              {club && <Crest short={club.short} color={club.color} size={44} />}
              <div className="flex-1 text-center">
                <div className="font-display text-xl font-extrabold text-zinc-600">VS</div>
                <div className="text-[11px] text-zinc-500">{fixture.home ? 'Home' : 'Away'}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-3">
                  <div>
                    <div className="text-sm font-bold leading-tight">{fixture.opponent}</div>
                    <div className="text-[11px] text-zinc-500">Squad {fixture.opponentStrength}</div>
                  </div>
                  <Crest short={crestShort(fixture.opponentShort)} color={fixture.opponentColor} size={44} />
                </div>
              </div>
            </div>
            <Link href="/match" className="mt-4 block">
              <Button block size="lg">
                <Play className="h-5 w-5 fill-current" />
                {bolts < 1 ? `Exhausted · ${fmtCountdown(msToNext)}` : 'Go to match day'}
              </Button>
            </Link>
          </Card>
        </div>
      )}

      {/* Training & recovery */}
      {season && phase === 'playing' && (
        <div>
          <SectionTitle right={<span className="text-[11px] text-zinc-500">{MAX_TRAININGS_PER_FIXTURE - used} sessions left before kickoff</span>}>Training</SectionTitle>
          <Card className="p-3.5">
            <div className="grid grid-cols-2 gap-2">
              {ATTR_KEYS.map((k) => (
                <motion.button
                  key={k}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => doTrain(k)}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-left active:bg-white/10"
                >
                  <span>
                    <span className="block text-[13px] font-bold">{ATTR_LABEL[k]}</span>
                    <span className="mt-1 block h-1 w-14 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-neon-400" style={{ width: `${player.xp[k] * 100}%` }} />
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-gold-300">
                    <Zap className="h-3 w-3 fill-current" />1
                  </span>
                </motion.button>
              ))}
            </div>
            <Button
              block
              variant="ghost"
              size="sm"
              className="mt-2.5"
              onClick={() => {
                const r = physio();
                toast(r.msg, r.ok ? 'good' : 'bad');
              }}
            >
              <HeartPulse className="h-4 w-4 text-crimson-400" /> Recovery clinic · +2 bolts ({fmtMoneyK((player.contract?.wage ?? 0) * 3)})
            </Button>
          </Card>
        </div>
      )}

      {/* Season snapshot */}
      {season && (
        <div>
          <SectionTitle right={<Link href="/calendar" className="flex items-center text-[11px] font-semibold text-neon-400">Full season <ChevronRight className="h-3 w-3" /></Link>}>This season</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            <Tile label="League" value={`${pos}${ordinal(pos)}`} />
            <Tile label="Apps" value={season.stats.apps} />
            <Tile label="G + A" value={`${season.stats.goals}+${season.stats.assists}`} />
            <Tile label="Avg" value={avg ? avg.toFixed(1) : '–'} />
          </div>
          {ovr < CALL_UP_OVR && (
            <p className="mt-2.5 flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
              <Trophy className="h-3 w-3 text-gold-400" /> Reach OVR {CALL_UP_OVR} for national-team call-ups ({CALL_UP_OVR - ovr} to go).
            </p>
          )}
        </div>
      )}

      <div>
        <SectionTitle>Reputation</SectionTitle>
        <Card className="p-4">
          <RepBars rep={player.rep} />
        </Card>
      </div>

      <div>
        <SectionTitle>Attributes</SectionTitle>
        <Card className="p-4">
          <AttributeBars attrs={player.attrs} />
        </Card>
      </div>

      {news.length > 0 && (
        <div>
          <SectionTitle right={<Newspaper className="h-3.5 w-3.5 text-zinc-600" />}>News</SectionTitle>
          <Card className="divide-y divide-white/[0.06]">
            {news.slice(0, 6).map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 text-[13px] leading-snug text-zinc-300">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', TONE[n.tone])} />
                {n.text}
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
