'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Mic, MicOff, Newspaper } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { FloatingAction } from '@/components/ui/FloatingAction';
import { CONTROVERSIES, controversyChance, headlineFor, type Controversy, type ControversyCtx } from '@/lib/data/controversies';
import { FOLLOW_UPS, PRESS_QUESTIONS, REACTIONS, type FollowUp, type PressAnswer, type PressContext, type PressQuestion } from '@/lib/data/press';
import { moodLabel, repetition } from '@/lib/data/talks';
import { REP_LABEL } from '@/lib/engine/player';
import { weightedPick } from '@/lib/engine/rng';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import type { RepKey } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ControversyPanel } from './ControversyPanel';

const STYLE_LABEL = { tactical: 'Tactical', bold: 'Bold', humble: 'Humble', deflect: 'Deflect', 'no-comment': 'Silent' } as const;
const STYLE_TONE = { tactical: 'info', bold: 'bad', humble: 'good', deflect: 'neutral', 'no-comment': 'neutral' } as const;

export interface AnswerInfo {
  followUp?: boolean;
  question?: string;
}

export function PressZone({
  context,
  playerName,
  recentQuestions,
  recentStyles,
  onAnswer,
  onContinue,
}: {
  context: PressContext;
  playerName: string;
  /** Question ids asked lately: they rarely come back */
  recentQuestions: string[];
  /** Answer styles used lately: repeating one weakens it */
  recentStyles: string[];
  onAnswer: (a: PressAnswer, info: AnswerInfo) => void;
  onContinue: () => void;
}) {
  const t = useT();
  const question = useMemo<PressQuestion>(() => {
    const pool = PRESS_QUESTIONS.filter((q) => q.when(context));
    return weightedPick(pool, (q) => q.weight * (recentQuestions.includes(q.id) ? 0.12 : 1), Math.random);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);
  // a second question follows most of the time, shaped by the way you answered the first
  const [chosen, setChosen] = useState<PressAnswer | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [followChosen, setFollowChosen] = useState<PressAnswer | null>(null);
  const reaction = useMemo(() => (chosen ? REACTIONS[chosen.style][Math.floor(Math.random() * REACTIONS[chosen.style].length)] : ''), [chosen]);
  const [stirred, setStirred] = useState(false);
  const [scandal, setScandal] = useState<Controversy | null>(null);
  const stirMedia = useGameStore((s) => s.stirMedia);
  const mood = useGameStore((s) => s.player?.talks?.mood ?? context.mood);
  const amp = 1 + context.mediaHeat / 150;
  const vars = { opp: t(context.opp), my: context.myScore, their: context.oppScore, name: playerName };
  const done = chosen && (!followUp || followChosen);
  const headline = useMemo(() => (done && chosen ? headlineFor(chosen.style, stirred) : null), [done, chosen, stirred]);

  const answer = (a: PressAnswer) => {
    setChosen(a);
    onAnswer(a, { question: question.id });
    const options = FOLLOW_UPS[a.style];
    if (options?.length && Math.random() < 0.72) setFollowUp(options[Math.floor(Math.random() * options.length)]);
  };

  const answerFollow = (a: PressAnswer) => {
    setFollowChosen(a);
    onAnswer(a, { followUp: true });
  };

  /** After the interview the media may uncover a story — how you react decides your future. */
  const finish = () => {
    if (!chosen) return;
    const live = useGameStore.getState().player;
    const ctx: ControversyCtx = {
      ...context,
      mediaHeat: live?.rep.mediaHeat ?? context.mediaHeat,
      coachTrust: live?.rep.coachTrust ?? context.coachTrust,
      lockerRoom: live?.rep.lockerRoom ?? context.lockerRoom,
      fanPopularity: live?.rep.fanPopularity ?? context.fanPopularity,
      answerStyle: chosen.style,
      stirred,
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

  const label = moodLabel(mood);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-neon-400">{t('Post-match')}</div>
          <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{t('Press Zone')}</h2>
        </div>
        <Chip tone={label === 'Friendly' ? 'good' : label === 'Hostile' ? 'bad' : 'neutral'}>
          {t('Press mood')}: {t(label)}
        </Chip>
      </div>

      {/* First question */}
      <Reporter name={question.reporter} outlet={question.outlet} heat={context.mediaHeat} hostile={question.tone === 'hostile'}>
        “{t(question.question, vars)}”
      </Reporter>
      <Answers
        answers={question.answers}
        chosen={chosen}
        onPick={answer}
        amp={amp}
        vars={vars}
        repeated={(style) => repetition(recentStyles, style).count >= 2}
      />

      {/* The journalist reacts, then the follow-up */}
      <AnimatePresence>
        {chosen && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-1 text-center text-sm italic text-zinc-400">
            {t(reaction)}
          </motion.p>
        )}
        {chosen && followUp && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-3">
            <Reporter name={question.reporter} outlet={question.outlet} heat={0} label={t('Follow-up')}>
              “{t(followUp.question, vars)}”
            </Reporter>
            <Answers answers={followUp.answers} chosen={followChosen} onPick={answerFollow} amp={amp * 0.6} vars={vars} repeated={() => false} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
        <Mic className="h-3 w-3" /> {t('Media Heat amplifies every answer — good or bad.')}
      </p>

      {done && headline && (
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-2.5">
          <Card className="border-gold-400/25 p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-300">
              <Newspaper className="h-3.5 w-3.5" /> {headline.outlet}
            </div>
            <p className="mt-1.5 font-display text-2xl font-extrabold uppercase leading-tight">{t(headline.text, { name: playerName })}</p>
          </Card>
          {!stirred ? (
            <button
              onClick={() => {
                setStirred(true);
                stirMedia();
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-crimson-500/40 bg-crimson-500/[0.07] px-3.5 py-3 text-left active:scale-[0.98]"
            >
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-crimson-400">
                  <Flame className="h-4 w-4" /> {t('Fuel the story')}
                </span>
                <span className="text-[11px] text-zinc-400">{t('Get the media talking: more Media Heat and fans, but scandals become likelier.')}</span>
              </span>
            </button>
          ) : (
            <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-crimson-400">
              <Flame className="h-3.5 w-3.5" /> {t('The media are running with it.')}
            </p>
          )}
          <FloatingAction>
            <Button block size="lg" onClick={finish}>
              {t('See match report')}
            </Button>
          </FloatingAction>
        </motion.div>
      )}
    </div>
  );
}

function Reporter({ name, outlet, heat, hostile, label, children }: { name: string; outlet: string; heat: number; hostile?: boolean; label?: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <Card strong className={cn('p-4', hostile && 'border-crimson-500/30')}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full text-lg', hostile ? 'bg-gradient-to-b from-crimson-500/40 to-crimson-900/40' : 'bg-gradient-to-b from-sky-500/40 to-sky-900/40')}>🎙️</div>
        <div>
          <div className="text-sm font-bold">{name}</div>
          <div className="text-[11px] text-zinc-500">{outlet}</div>
        </div>
        {label && <Chip className="ml-auto">{label}</Chip>}
        {!label && hostile && (
          <Chip tone="bad" className="ml-auto">
            {t('Tough question')}
          </Chip>
        )}
        {!label && !hostile && heat >= 40 && (
          <Chip tone="bad" className="ml-auto">
            🔥 {t('Heat')} {heat}
          </Chip>
        )}
      </div>
      <p className="mt-3 text-[17px] font-semibold leading-snug">{children}</p>
    </Card>
  );
}

function Answers({
  answers,
  chosen,
  onPick,
  amp,
  vars,
  repeated,
}: {
  answers: PressAnswer[];
  chosen: PressAnswer | null;
  onPick: (a: PressAnswer) => void;
  amp: number;
  vars: Record<string, string | number>;
  /** The style has been used again and again lately */
  repeated: (style: string) => boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-2.5">
      {answers.map((a, i) => {
        const active = chosen?.id === a.id;
        const dim = chosen && !active;
        return (
          <motion.button
            key={a.id}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: dim ? 0.4 : 1 }}
            transition={{ delay: 0.07 * i }}
            whileTap={chosen ? undefined : { scale: 0.98 }}
            disabled={!!chosen}
            onClick={() => onPick(a)}
            className={cn(
              'gloss-edge w-full rounded-2xl border p-3.5 text-left transition-colors',
              active ? 'border-neon-400/60 bg-neon-400/10' : 'border-white/[0.08] bg-white/[0.04]',
              a.style === 'no-comment' && 'border-dashed',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[15px] font-bold">
                {a.style === 'no-comment' && <MicOff className="h-4 w-4 text-zinc-500" />}
                {t(a.label)}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {repeated(a.style) && !chosen && <Chip tone="bad">{t('Overused')}</Chip>}
                <Chip tone={STYLE_TONE[a.style]}>{t(STYLE_LABEL[a.style])}</Chip>
              </span>
            </div>
            <p className="mt-1.5 text-[13px] italic text-zinc-400">{t(a.quote, vars)}</p>
            <AnimatePresence>
              {active && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {a.morale !== 0 && <Chip tone="info">{t('Morale')} {a.morale > 0 ? '+' : ''}{a.morale}</Chip>}
                    {(Object.entries(a.rep) as [RepKey, number][]).map(([k, v]) => {
                      const val = Math.round(v * amp);
                      return (
                        <Chip key={k} tone={k === 'mediaHeat' ? 'gold' : val > 0 ? 'good' : 'bad'}>
                          {t(REP_LABEL[k].replace(' Respect', ''))} {val > 0 ? '+' : ''}
                          {val}
                        </Chip>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
