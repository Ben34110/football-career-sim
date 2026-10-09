'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { PRESS_QUESTIONS, type PressAnswer, type PressContext, type PressQuestion } from '@/lib/data/press';
import { REP_LABEL } from '@/lib/engine/player';
import { weightedPick } from '@/lib/engine/rng';
import type { RepKey } from '@/lib/types';
import { cn } from '@/lib/utils';

const STYLE_LABEL = { tactical: 'Tactical', bold: 'Bold', humble: 'Humble', deflect: 'Deflect', 'no-comment': 'Silent' } as const;
const STYLE_TONE = { tactical: 'info', bold: 'bad', humble: 'good', deflect: 'neutral', 'no-comment': 'neutral' } as const;

export function PressZone({
  context,
  onAnswer,
  onContinue,
}: {
  context: PressContext;
  onAnswer: (a: PressAnswer) => void;
  onContinue: () => void;
}) {
  const question = useMemo<PressQuestion>(() => {
    const pool = PRESS_QUESTIONS.filter((q) => q.when(context));
    return weightedPick(pool, (q) => q.weight, Math.random);
  }, [context]);
  const [chosen, setChosen] = useState<PressAnswer | null>(null);
  const amp = 1 + context.mediaHeat / 150;

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow text-neon-400">Post-match</div>
        <h2 className="font-display text-4xl font-extrabold uppercase leading-none">Press Zone</h2>
      </div>

      {/* Reporter */}
      <Card strong className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-sky-500/40 to-sky-900/40 text-lg">🎙️</div>
          <div>
            <div className="text-sm font-bold">{question.reporter}</div>
            <div className="text-[11px] text-zinc-500">{question.outlet}</div>
          </div>
          {context.mediaHeat >= 40 && (
            <Chip tone="bad" className="ml-auto">
              🔥 Heat {context.mediaHeat}
            </Chip>
          )}
        </div>
        <p className="mt-3 text-[17px] font-semibold leading-snug">“{question.question}”</p>
      </Card>

      <div className="space-y-2.5">
        {question.answers.map((a, i) => {
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
              onClick={() => {
                setChosen(a);
                onAnswer(a);
              }}
              className={cn(
                'gloss-edge w-full rounded-2xl border p-3.5 text-left transition-colors',
                active ? 'border-neon-400/60 bg-neon-400/10' : 'border-white/[0.08] bg-white/[0.04]',
                a.style === 'no-comment' && 'border-dashed',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[15px] font-bold">
                  {a.style === 'no-comment' && <MicOff className="h-4 w-4 text-zinc-500" />}
                  {a.label}
                </span>
                <Chip tone={STYLE_TONE[a.style]}>{STYLE_LABEL[a.style]}</Chip>
              </div>
              <p className="mt-1.5 text-[13px] italic text-zinc-400">{a.quote}</p>
              <AnimatePresence>
                {active && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {a.morale !== 0 && <Chip tone="info">Morale {a.morale > 0 ? '+' : ''}{a.morale}</Chip>}
                      {(Object.entries(a.rep) as [RepKey, number][]).map(([k, v]) => {
                        const val = Math.round(v * amp);
                        return (
                          <Chip key={k} tone={k === 'mediaHeat' ? 'gold' : val > 0 ? 'good' : 'bad'}>
                            {REP_LABEL[k].replace(' Respect', '')} {val > 0 ? '+' : ''}
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

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
        <Mic className="h-3 w-3" /> Media Heat amplifies every answer — good or bad.
      </p>
      {chosen && (
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky bottom-3 z-10">
          <Button block size="lg" onClick={onContinue}>
            See match report
          </Button>
        </motion.div>
      )}
    </div>
  );
}
