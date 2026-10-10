'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CLUBS, getClub } from '@/lib/data/clubs';
import { surnamesFor } from '@/lib/data/surnames';
import { standingsFor } from '@/lib/engine/standing';
import { getNationality } from '@/lib/data/nationalities';
import type { PressAnswer, PressContext } from '@/lib/data/press';
import { BOOST_BY_ID, mergeBrief } from '@/lib/data/boosts';
import { pickRitual, type Ritual, type RitualOption } from '@/lib/data/rituals';
import { EXPECTATION_TARGET, expectationEffect } from '@/lib/data/speeches';
import { repetition, scaleStance } from '@/lib/data/talks';
import { buildCtx, buildResult, startsOnBench, type MatchCtx } from '@/lib/engine/match';
import { LEVEL_STRENGTH, ovrOf, syncEnergy } from '@/lib/engine/player';
import { buildOtherGames, type OtherGame } from '@/lib/engine/livefeed';
import { currentFixture, deriveEuroTable, leaguePosition } from '@/lib/engine/season';
import { useEnergy } from '@/lib/hooks';
import { fixtureDate } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUiStore } from '@/lib/ui';
import { crestFace } from '@/lib/utils';
import type { Fixture, FixtureResult, MatchState, SeasonState } from '@/lib/types';
import { CupDraw } from './CupDraw';
import { GroupDraw } from './GroupDraw';
import { LiveMatch, type LiveBoard, type TeamBadge } from './LiveMatch';
import { MatchSummary, type ExpectationOutcome, type Snapshot } from './MatchSummary';
import { PreMatch } from './PreMatch';
import { PressZone, type AnswerInfo } from './PressZone';
import { Shootout, type ShootoutResult } from './Shootout';

type Stage = 'brief' | 'live' | 'shootout' | 'press' | 'summary';

/** What the live-table sheet shows: the table that matters and the games played at the same time. */
function liveBoardFor(season: SeasonState | null, fixture: Fixture, games: OtherGame[], t: (k: string, v?: Record<string, string | number>) => string): LiveBoard {
  const tr = season?.tourney;
  if (fixture.kind === 'tournament' && tr?.drawn) {
    const name = t(season?.tournamentName ?? 'Tournament');
    return {
      table: fixture.knockout ? null : tr.groups[tr.myGroup],
      games,
      opponent: fixture.opponent.replace(/ (U20|U23)$/, ''),
      heading: fixture.knockout ? name : t('Group {l}', { l: 'ABCD'[tr.myGroup] }),
      gamesTitle: `${name} · ${t('Elsewhere right now')}`,
    };
  }
  const table =
    fixture.kind === 'league'
      ? season?.table ?? null
      : fixture.kind === 'euro' && !fixture.knockout
        ? season?.euroTable ?? (season ? deriveEuroTable(season) ?? null : null)
        : null;
  return { table, games, opponent: fixture.opponent };
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
  /** The other games played while yours is on (results are kept when the match is committed) */
  const [others, setOthers] = useState<OtherGame[]>([]);

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
      ? { name: `${t(nat.name)}${fixture.level ? ' ' + fixture.level : ''}`, short: nat.flag, color: '#fbbf24' }
      : { name: club?.name ?? t('Free agent'), short: club?.short ?? 'FA', color: club?.color ?? '#a1a1aa' };
    const opp: TeamBadge = { name: t(fixture.opponent), short: crestFace(fixture.opponentShort), color: fixture.opponentColor };
    const strength = national ? nat.strength + LEVEL_STRENGTH[fixture.level ?? 'A'] : club?.strength ?? 55;
    // who we are facing: the standing in the table that counts, or the team's level when there is none
    const st = standingsFor(season, fixture);
    const pts = t('Pts').toLowerCase();
    me.rank = st.me ? `#${st.me.rank} · ${st.me.pts} ${pts}` : `${t('Squad')} ${Math.round(strength)}`;
    opp.rank = st.opp ? `#${st.opp.rank} · ${st.opp.pts} ${pts}` : `${t('Squad')} ${fixture.opponentStrength}`;
    return { me, opp, strength };
  }, [player, fixture, season, t]);

  /** One pre-match moment per fixture: a different format every time */
  const ritual = useMemo<Ritual | null>(() => {
    if (!player || !season || !fixture || !badges) return null;
    return pickRitual(
      {
        diff: badges.strength - fixture.opponentStrength,
        age: player.age,
        trust: player.rep.coachTrust,
        important: fixture.knockout || fixture.kind === 'tournament' || fixture.kind === 'euro' || /Matchday (5|10)$/.test(fixture.label),
        home: fixture.home,
      },
      player.talks?.speeches ?? [],
    );
    // a new moment only when the fixture changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture?.id, !!player, !!season, !!badges]);

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

  const kickoff = (rawStance: RitualOption, usedRitual: Ritual, boostId: string | null) => {
    const store = useGameStore.getState();
    const p0 = store.player!;
    const boltsBefore = syncEnergy(p0.energy, Date.now()).bolts;
    if (!store.beginMatch()) {
      toast(t('Not enough energy to play.'), 'bad');
      return;
    }
    // the same talk week after week loses its effect
    const stance = scaleStance(rawStance, repetition(p0.talks?.stances ?? [], rawStance.id).factor);
    setSnap({ rep: p0.rep, attrs: p0.attrs, money: p0.money, ovr: ovrOf(p0) });
    const boost = boostId ? BOOST_BY_ID[boostId] : undefined;
    store.applyStance({ morale: stance.morale + (boost?.morale ?? 0), rep: stance.rep });
    if (boost) store.consumeBoost(boost.id);
    store.recordTalk({ stance: rawStance.id, speech: usedRitual.id });
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
        myNames: surnamesFor(national ? p.nationality : getClub(p.clubId)?.country),
        oppNames: surnamesFor(national ? (fixture.opponentShort.split(' ').pop() ?? fixture.opponent) : (CLUBS.find((c) => c.name === fixture.opponent)?.country ?? getClub(p.clubId)?.country)),
        teamStrength: badges.strength,
        oppName: fixture.opponent,
        oppStrength: fixture.opponentStrength,
        home: national ? false : fixture.home,
        knockout: fixture.knockout,
        kind: fixture.kind,
        mods: { perfBonus: stance.perfBonus, expectation: stance.expectation, ratingTarget: EXPECTATION_TARGET[stance.expectation] + (stance.brief?.target ?? 0), brief: mergeBrief(stance.brief, boost?.effect) },
        benched: startsOnBench(p0.rep.coachTrust, p0.form, fixture.kind),
        meHome: fixture.home,
        fatigueRelief: p.upgrades?.nutrition ?? 0,
      }),
    );
    setOthers(season ? buildOtherGames(season, fixture, Math.random) : []);
    setStage('live');
  };

  const finalise = (m: MatchState, shoot: ShootoutResult | null) => {
    if (!ctx) return;
    const extra = shoot ? shoot.playerScored * 0.4 - shoot.playerMissed * 0.7 : 0;
    const res = buildResult(m, ctx, shoot ? { my: shoot.my, opp: shoot.opp } : null, extra, Math.random);
    const store = useGameStore.getState();
    store.commitMatch(res, others);

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
      opp: fixture.opponent,
      myScore: res.myScore,
      oppScore: res.oppScore,
      label: fixture.label,
      recent: (useGameStore.getState().season?.fixtures ?? [])
        .filter((f) => f.status === 'played' && f.result)
        .slice(-3)
        .map((f) => f.result!.outcome),
      mood: p.talks?.mood ?? 0,
      kind: fixture.kind,
      meHome: fixture.home,
      myTeam: badges.me.name,
      shootout: shoot ? { my: shoot.my, opp: shoot.opp } : undefined,
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

  const onPress = (a: PressAnswer, info: AnswerInfo) => useGameStore.getState().applyPress(a, { ...info, win: result?.outcome === 'W' || (result?.rating ?? 0) >= 7.2 });


  return (
    <div className="pb-4">
      {stage === 'brief' && fixture.drawn === false && fixture.kind === 'tournament' && season?.tourney && !season.tourney.drawn && (
        <GroupDraw tourney={season.tourney} tournament={season.tournamentName ?? ''} onDraw={(picks) => useGameStore.getState().drawTournamentGroup(picks)} />
      )}
      {stage === 'brief' && fixture.drawn === false && !(fixture.kind === 'tournament' && season?.tourney) && (
        <CupDraw fixture={fixture} me={badges.me} myStrength={badges.strength} onDraw={(i) => useGameStore.getState().drawFixture(fixture.id, i)} />
      )}
      {stage === 'brief' && fixture.drawn !== false && ritual && (
        <PreMatch
          fixture={fixture}
          me={badges.me}
          opp={badges.opp}
          myStrength={badges.strength}
          ritual={ritual}
          bolts={bolts}
          msToNext={msToNext}
          fatigueRelief={player.upgrades?.nutrition ?? 0}
          date={season ? fixtureDate(season, Math.max(0, season.fixtures.findIndex((f) => f.id === fixture.id))) : new Date()}
          talks={player.talks}
          boosts={player.boosts}
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
        <LiveMatch ctx={ctx} meHome={fixture.home} competition={{ kind: fixture.kind, label: fixture.label }} board={liveBoardFor(season, fixture, others, t)} me={badges.me} opp={badges.opp} finishing={ctx.attrs.finishing} composure={ctx.attrs.composure} onFinished={onLiveFinished} />
      )}
      {stage === 'shootout' && ctx && finalMatch && (
        <Shootout ctx={ctx} me={badges.me} opp={badges.opp} finishing={ctx.attrs.finishing} composure={ctx.attrs.composure} playerOut={finalMatch.subbedOffAt !== undefined} onDone={(r) => finalise(finalMatch, r)} />
      )}
      {stage === 'press' && pressCtx && <PressZone context={pressCtx} playerName={player.name} look={player.look} kit={badges.me.color} date={season ? new Date(fixtureDate(season, Math.max(0, season.fixtures.findIndex((f) => f.id === fixture.id))).getTime() + 86_400_000) : new Date()} roundup={others.map((g) => ({ home: g.home, away: g.away, h: g.final[0], a: g.final[1] }))} edition={(season?.stats.apps ?? 0) + 1} onAnswer={onPress} onContinue={() => setStage('summary')} />}
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
