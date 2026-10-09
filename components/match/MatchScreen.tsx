'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getClub } from '@/lib/data/clubs';
import { getNationality } from '@/lib/data/nationalities';
import type { PressAnswer, PressContext } from '@/lib/data/press';
import { EXPECTATION_TARGET, expectationEffect, SPEECHES, type Speech, type StanceEffect } from '@/lib/data/speeches';
import { buildCtx, buildResult, startsOnBench, type MatchCtx } from '@/lib/engine/match';
import { ovrOf, syncEnergy } from '@/lib/engine/player';
import { currentFixture } from '@/lib/engine/season';
import { useEnergy } from '@/lib/hooks';
import { fixtureDate } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUiStore } from '@/lib/ui';
import { crestShort } from '@/lib/utils';
import type { Fixture, FixtureResult, MatchState } from '@/lib/types';
import { LiveMatch, type TeamBadge } from './LiveMatch';
import { MatchSummary, type ExpectationOutcome, type Snapshot } from './MatchSummary';
import { PreMatch } from './PreMatch';
import { PressZone } from './PressZone';
import { Shootout, type ShootoutResult } from './Shootout';

type Stage = 'brief' | 'live' | 'shootout' | 'press' | 'summary';

function pickSpeech(f: Fixture, diff: number, trust: number): Speech {
  if (f.kind === 'intl' || f.kind === 'tournament') return SPEECHES.international;
  if (f.kind === 'cup') return SPEECHES.cup;
  if (trust < 30) return SPEECHES.trust;
  if (/Matchday (5|10)$/.test(f.label)) return SPEECHES.derby;
  return diff <= -4 ? SPEECHES.underdog : SPEECHES.favourite;
}

export function MatchScreen() {
  const t = useT();
  const router = useRouter();
  const player = useGameStore((s) => s.player);
  const season = useGameStore((s) => s.season);
  const gamePhase = useGameStore((s) => s.phase);
  const { bolts, msToNext } = useEnergy();
  const setImmersive = useUiStore((s) => s.setImmersive);

  const [stage, setStage] = useState<Stage>('brief');
  const [fx, setFx] = useState<Fixture | null>(null);
  const [ctx, setCtx] = useState<MatchCtx | null>(null);
  const [finalMatch, setFinalMatch] = useState<MatchState | null>(null);
  const [result, setResult] = useState<FixtureResult | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [expect, setExpect] = useState<ExpectationOutcome | null>(null);
  const [pressCtx, setPressCtx] = useState<PressContext | null>(null);
  const [seasonDone, setSeasonDone] = useState(false);

  useEffect(() => {
    setImmersive(stage === 'live' || stage === 'shootout' || stage === 'press');
    return () => setImmersive(false);
  }, [stage, setImmersive]);

  const upcoming = season ? currentFixture(season) : null;
  const fixture = fx ?? upcoming;

  /* Team badges (club or country) */
  const badges = useMemo(() => {
    if (!player || !fixture) return null;
    const club = getClub(player.clubId);
    const nat = getNationality(player.nationality);
    const national = fixture.kind === 'intl' || fixture.kind === 'tournament';
    const me: TeamBadge = national
      ? { name: t(nat.name), short: nat.code, color: '#fbbf24' }
      : { name: club?.name ?? t('Free agent'), short: club?.short ?? 'FA', color: club?.color ?? '#a1a1aa' };
    const opp: TeamBadge = { name: t(fixture.opponent), short: crestShort(fixture.opponentShort), color: fixture.opponentColor };
    const strength = national ? nat.strength : club?.strength ?? 55;
    return { me, opp, strength };
  }, [player, fixture, t]);

  // the season can vanish mid-flow (contract terminated after a scandal): keep the report on screen
  if (!player || (!season && stage === 'brief' && gamePhase === 'playing')) return null;

  if (stage === 'brief' && (gamePhase !== 'playing' || !fixture)) {
    return (
      <Card className="mt-6 p-8 text-center">
        <div className="text-4xl">{gamePhase === 'playing' ? '🏁' : '📋'}</div>
        <h2 className="mt-3 font-display text-3xl font-extrabold uppercase">{gamePhase === 'playing' ? t('Nothing left to play') : t('Season complete')}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {gamePhase === 'free-agent' ? t('You’re a free agent — find a club first.') : t('Head back to the hub to review your season and move on.')}
        </p>
        <Link href={gamePhase === 'free-agent' ? '/transfers' : '/home'} className="mt-5 inline-block">
          <Button>{gamePhase === 'free-agent' ? t('Open transfer market') : t('Go to hub')}</Button>
        </Link>
      </Card>
    );
  }
  if (!fixture || !badges) return null;

  /* ───── Handlers ───── */

  const kickoff = (stance: StanceEffect) => {
    const store = useGameStore.getState();
    const p0 = store.player!;
    const boltsBefore = syncEnergy(p0.energy, Date.now()).bolts;
    if (!store.beginMatch()) {
      toast(t('Not enough energy to play.'), 'bad');
      return;
    }
    setSnap({ rep: p0.rep, attrs: p0.attrs, money: p0.money, ovr: ovrOf(p0) });
    store.applyStance(stance);
    const p = useGameStore.getState().player!;
    const national = fixture.kind === 'intl' || fixture.kind === 'tournament';
    setFx(fixture);
    setCtx(
      buildCtx({
        playerName: p.name,
        position: p.position,
        attrs: p.attrs,
        ovr: ovrOf(p),
        morale: p.morale,
        boltsBefore,
        rep: p.rep,
        myTeam: badges.me.name,
        teamStrength: badges.strength,
        oppName: fixture.opponent,
        oppStrength: fixture.opponentStrength,
        home: national ? false : fixture.home,
        knockout: fixture.knockout,
        kind: fixture.kind,
        mods: { perfBonus: stance.perfBonus, expectation: stance.expectation, ratingTarget: EXPECTATION_TARGET[stance.expectation] },
        benched: startsOnBench(p0.rep.coachTrust, p0.form, fixture.kind),
      }),
    );
    setStage('live');
  };

  const finalise = (m: MatchState, shoot: ShootoutResult | null) => {
    if (!ctx) return;
    const extra = shoot ? shoot.playerScored * 0.4 - shoot.playerMissed * 0.7 : 0;
    const res = buildResult(m, ctx, shoot ? { my: shoot.my, opp: shoot.opp } : null, extra, Math.random);
    const store = useGameStore.getState();
    store.commitMatch(res);

    const met = res.rating >= ctx.mods.ratingTarget;
    const eff = expectationEffect(ctx.mods.expectation, met);
    store.adjust(eff.morale, eff.rep);
    setExpect({ expectation: ctx.mods.expectation, target: ctx.mods.ratingTarget, met, text: eff.text });
    setResult(res);
    setSeasonDone(useGameStore.getState().phase === 'season-end');

    const p = useGameStore.getState().player!;
    setPressCtx({
      outcome: res.outcome,
      goals: res.goals,
      assists: res.assists,
      rating: res.rating,
      knockout: fixture.knockout,
      missedKick: m.missedKick || (shoot?.playerMissed ?? 0) > 0,
      mediaHeat: p.rep.mediaHeat,
      coachTrust: p.rep.coachTrust,
      lockerRoom: p.rep.lockerRoom,
      fanPopularity: p.rep.fanPopularity,
      apps: p.totals.apps,
      benched: !!res.benched,
      subbedOff: !!res.subbedOff,
    });
    setStage('press');
  };

  const onLiveFinished = (m: MatchState) => {
    setFinalMatch(m);
    if (fixture.knockout && m.myScore === m.oppScore) setStage('shootout');
    else finalise(m, null);
  };

  const onPress = (a: PressAnswer) => useGameStore.getState().applyPress(a);

  const speech = pickSpeech(fixture, badges.strength - fixture.opponentStrength, player.rep.coachTrust);

  return (
    <div className="pb-4">
      {stage === 'brief' && (
        <PreMatch
          fixture={fixture}
          me={badges.me}
          opp={badges.opp}
          myStrength={badges.strength}
          speech={speech}
          bolts={bolts}
          msToNext={msToNext}
          date={season ? fixtureDate(season, Math.max(0, season.fixtures.findIndex((f) => f.id === fixture.id))) : new Date()}
          benchWhy={
            startsOnBench(player.rep.coachTrust, player.form, fixture.kind)
              ? player.rep.coachTrust < 25
                ? 'trust'
                : 'form'
              : null
          }
          onKickoff={kickoff}
        />
      )}
      {stage === 'live' && ctx && (
        <LiveMatch ctx={ctx} me={badges.me} opp={badges.opp} finishing={ctx.attrs.finishing} composure={ctx.attrs.composure} onFinished={onLiveFinished} />
      )}
      {stage === 'shootout' && ctx && finalMatch && (
        <Shootout ctx={ctx} me={badges.me} opp={badges.opp} finishing={ctx.attrs.finishing} composure={ctx.attrs.composure} onDone={(r) => finalise(finalMatch, r)} />
      )}
      {stage === 'press' && pressCtx && <PressZone context={pressCtx} playerName={player.name} onAnswer={onPress} onContinue={() => setStage('summary')} />}
      {stage === 'summary' && result && snap && expect && (
        <MatchSummary
          fixture={fixture}
          result={result}
          me={badges.me}
          opp={badges.opp}
          snap={snap}
          expectation={expect}
          clutch={{ wins: finalMatch?.clutchWins ?? 0, total: finalMatch?.clutchTotal ?? 0 }}
          seasonDone={seasonDone}
          onContinue={() => router.push('/home')}
        />
      )}
    </div>
  );
}
