'use client';

import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { CONTROVERSIES, controversyChance, type Controversy, type ControversyCtx } from '@/lib/data/controversies';
import type { Look } from '@/lib/data/look';
import { paperEffect, type PressAnswer, type PressContext } from '@/lib/data/press';
import { weightedPick } from '@/lib/engine/rng';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { ControversyPanel } from './ControversyPanel';
import { Newspaper, type RoundupLine } from './Newspaper';

export interface AnswerInfo {
  followUp?: boolean;
  question?: string;
}

/** After the match: the morning paper tells the story. No questions — just the page. */
export function PressZone({
  context,
  playerName,
  look,
  date,
  roundup,
  edition,
  onAnswer,
  onContinue,
}: {
  context: PressContext;
  playerName: string;
  look?: Look;
  date: Date;
  roundup: RoundupLine[];
  edition: number;
  onAnswer: (a: PressAnswer, info: AnswerInfo) => void;
  onContinue: () => void;
}) {
  const t = useT();
  const [scandal, setScandal] = useState<Controversy | null>(null);
  const applied = useRef(false);

  /** The headlines move your standing; then, now and then, a story breaks — and how you react decides your future. */
  const finish = () => {
    if (!applied.current) {
      applied.current = true;
      onAnswer(paperEffect(context), { followUp: true });
    }
    const live = useGameStore.getState().player;
    const ctx: ControversyCtx = {
      ...context,
      mediaHeat: live?.rep.mediaHeat ?? context.mediaHeat,
      coachTrust: live?.rep.coachTrust ?? context.coachTrust,
      lockerRoom: live?.rep.lockerRoom ?? context.lockerRoom,
      fanPopularity: live?.rep.fanPopularity ?? context.fanPopularity,
      answerStyle: 'tactical',
      stirred: false,
      pr: live?.upgrades?.pr ?? 0,
    };
    if (Math.random() < controversyChance(ctx)) {
      const pool = CONTROVERSIES.filter((c) => c.when(ctx));
      if (pool.length) {
        setScandal(weightedPick(pool, (c) => c.weight, Math.random));
        return;
      }
    }
    onContinue();
  };

  if (scandal) return <ControversyPanel scandal={scandal} onDone={onContinue} />;

  return (
    <div className="space-y-3">
      <Newspaper
        look={look}
        date={date}
        roundup={roundup}
        ctx={{
          name: playerName,
          club: context.myTeam,
          opp: t(context.opp),
          outcome: context.outcome,
          my: context.myScore,
          their: context.oppScore,
          goals: context.goals,
          assists: context.assists,
          rating: context.rating,
          label: context.label,
          kind: context.kind,
          home: context.meHome,
          missedKick: context.missedKick,
          subbedOff: context.subbedOff,
          benched: context.benched,
          shootout: context.shootout,
          recent: context.recent,
          edition,
        }}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <FloatingAction>
          <Button block size="lg" onClick={finish}>
            {t('See match report')}
          </Button>
        </FloatingAction>
      </motion.div>
    </div>
  );
}
