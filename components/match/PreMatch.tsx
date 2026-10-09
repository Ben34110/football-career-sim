'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Home as HomeIcon, MapPin, Mic2, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { EXPECTATION_TARGET, type Speech, type StanceEffect } from '@/lib/data/speeches';
import { REP_LABEL } from '@/lib/engine/player';
import { fmtCountdown, cn } from '@/lib/utils';
import type { Fixture, RepKey } from '@/lib/types';
import type { TeamBadge } from './LiveMatch';

const KIND_LABEL: Record<Fixture['kind'], string> = {
  league: 'League',
  cup: 'Domestic Cup',
  intl: 'International',
  tournament: 'Tournament',
};

export function PreMatch({
  fixture,
  me,
  opp,
  myStrength,
  speech,
  bolts,
  msToNext,
  benchRisk,
  onKickoff,
}: {
  fixture: Fixture;
  me: TeamBadge;
  opp: TeamBadge;
  myStrength: number;
  speech: Speech;
  bolts: number;
  msToNext: number;
  benchRisk: boolean;
  onKickoff: (s: StanceEffect) => void;
}) {
  const [picked, setPicked] = useState<StanceEffect | null>(null);
  const diff = myStrength - fixture.opponentStrength;
  const tag = diff >= 4 ? { t: 'Favourites', tone: 'good' as const } : diff <= -4 ? { t: 'Underdogs', tone: 'bad' as const } : { t: 'Even match', tone: 'gold' as const };
  const exhausted = bolts < 1;

  return (
    <div className="space-y-4">
      {/* Fixture hero */}
      <Card strong gold className="overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between">
          <Chip tone="gold">{KIND_LABEL[fixture.kind]}</Chip>
          <span className="eyebrow">{fixture.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <Crest short={me.short} color={me.color} size={56} />
            <span className="line-clamp-2 text-xs font-bold">{me.name}</span>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-extrabold text-zinc-600">VS</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-400">
              {fixture.home ? <HomeIcon className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {fixture.home ? 'Home' : 'Away'}
            </div>
          </div>
          <div className="flex w-24 flex-col items-center gap-1.5 text-center">
            <Crest short={opp.short} color={opp.color} size={56} />
            <span className="line-clamp-2 text-xs font-bold">{opp.name}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-xs">
          <span className="text-zinc-400">
            Squad <b className="font-num text-sm text-zinc-100">{Math.round(myStrength)}</b> vs <b className="font-num text-sm text-zinc-100">{fixture.opponentStrength}</b>
          </span>
          <Chip tone={tag.tone}>{tag.t}</Chip>
        </div>
        {fixture.knockout && <p className="mt-2 text-center text-[11px] text-gold-300">Knockout tie — a draw goes to penalties.</p>}
      </Card>

      {(benchRisk || bolts < 5) && (
        <div className="space-y-2">
          {benchRisk && (
            <Warn>
              Coach Trust is low — you’ll start on the <b>bench</b> and come on after 55 minutes.
            </Warn>
          )}
          {bolts < 5 && bolts >= 1 && (
            <Warn>
              Playing on {bolts} bolt{bolts === 1 ? '' : 's'}: fatigue costs you <b>−{5 - bolts} effective OVR</b>.
            </Warn>
          )}
        </div>
      )}

      {/* Locker room talk */}
      <div>
        <div className="mb-2.5 flex items-center gap-2 px-0.5">
          <Mic2 className="h-4 w-4 text-gold-300" />
          <h2 className="eyebrow">Locker room talk</h2>
        </div>
        <Card className="p-4">
          <div className="mb-2.5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800 font-display text-lg font-bold">
              M
            </div>
            <div>
              <div className="text-sm font-bold">The Manager</div>
              <div className="text-[11px] text-zinc-500">{speech.title}</div>
            </div>
          </div>
          <p className="text-[15px] italic leading-relaxed text-zinc-200">{speech.quote}</p>
        </Card>

        <p className="mb-2 mt-4 px-0.5 text-xs font-semibold text-zinc-400">How do you respond?</p>
        <div className="space-y-2.5">
          {speech.stances.map((st, i) => {
            const active = picked?.id === st.id;
            return (
              <motion.button
                key={st.id}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 * i }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPicked(st)}
                aria-pressed={active}
                className={cn(
                  'gloss-edge w-full rounded-2xl border p-3.5 text-left transition-all',
                  active ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : 'border-white/[0.08] bg-white/[0.04]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold">{st.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Chip tone={st.id === 'demand-ball' ? 'bad' : st.id === 'for-lads' ? 'gold' : 'good'}>{st.tag}</Chip>
                    {active && <Check className="h-4 w-4 text-neon-400" />}
                  </div>
                </div>
                <p className="mt-1.5 text-[13px] italic text-zinc-400">{st.quote}</p>
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        <Chip tone="info">Morale {st.morale > 0 ? '+' : ''}{st.morale}</Chip>
                        {(Object.entries(st.rep) as [RepKey, number][]).map(([k, v]) => (
                          <Chip key={k} tone={v > 0 ? 'good' : 'bad'}>
                            {REP_LABEL[k].replace(' Respect', '')} {v > 0 ? '+' : ''}
                            {v}
                          </Chip>
                        ))}
                        <Chip tone="gold">+{st.perfBonus} form</Chip>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-500">
                        Expectation: <b className="text-zinc-300">{st.expectation}</b> — you’re judged against a {EXPECTATION_TARGET[st.expectation].toFixed(1)}+ rating.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 pt-2">
        <Button block size="lg" disabled={!picked || exhausted} onClick={() => picked && onKickoff(picked)}>
          {exhausted ? (
            <>No energy · next bolt in {fmtCountdown(msToNext)}</>
          ) : (
            <>
              Kick off <span className="flex items-center gap-0.5 rounded-full bg-black/20 px-2 py-0.5 text-xs">−1 <Zap className="h-3 w-3 fill-current" /></span>
            </>
          )}
        </Button>
      </div>
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
