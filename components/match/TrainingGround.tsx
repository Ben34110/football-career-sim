'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, Sparkles, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Card';
import { GameIcon } from '@/components/ui/GameIcon';
import { Sheet } from '@/components/ui/Sheet';
import { DRILLS, SCOUTED, gameFor, scoutReport, trainOutcome, type Drill, type Effect, type Zone } from '@/lib/data/training';
import type { RitualOption } from '@/lib/data/rituals';
import { useT } from '@/lib/i18n';
import type { Attributes, MiniKind, MiniQuality } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MiniGame } from './MiniGame';

const ATTR_LABEL: Record<keyof Attributes, string> = { finishing: 'Finishing', composure: 'Composure', vision: 'Vision', stamina: 'Stamina' };
const QUALITY_TITLE: Record<MiniQuality, string> = { perfect: 'Perfect session', good: 'Good session', miss: 'Poor session' };
const QUALITY_TONE: Record<MiniQuality, string> = { perfect: 'text-gold-300', good: 'text-neon-300', miss: 'text-zinc-400' };

/** The attribute each mini-game leans on, for its sweet spot. */
function skillFor(kind: MiniKind, a: Attributes) {
  switch (kind) {
    case 'volley':
    case 'rebound':
    case 'power':
      return a.finishing;
    case 'slalom':
    case 'dribble':
      return a.composure;
    case 'block':
    case 'memory':
      return a.vision;
    default:
      return a.stamina;
  }
}

const ZONE_Y: Record<Zone, [number, number]> = { def: [22, 52], mid: [56, 90], att: [94, 124] };

/** The opponent on the tactics board: their eleven, the weak point glowing green and the danger red. */
function Board({ color, weak, danger }: { color: string; weak: Zone; danger: Zone }) {
  const rows: [number, number[]][] = [
    [12, [150]],
    [38, [48, 110, 190, 252]],
    [72, [48, 110, 190, 252]],
    [108, [112, 188]],
  ];
  const band = (z: Zone, tone: string, key: string) => (
    <motion.rect key={key} x="8" width="284" y={ZONE_Y[z][0]} height={ZONE_Y[z][1] - ZONE_Y[z][0]} rx="10" fill={tone} animate={{ opacity: [0.14, 0.34, 0.14] }} transition={{ duration: 1.8, repeat: Infinity }} />
  );
  return (
    <svg viewBox="0 0 300 150" className="block w-full" aria-hidden>
      <defs>
        <linearGradient id="tg-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14562f" />
          <stop offset="1" stopColor="#0d4224" />
        </linearGradient>
      </defs>
      <rect width="300" height="150" fill="url(#tg-grass)" />
      {[0, 1, 2, 3, 4].map((k) => (
        <rect key={k} y={k * 30} width="300" height="15" fill="#fff" opacity=".035" />
      ))}
      <rect x="8" y="4" width="284" height="142" rx="6" fill="none" stroke="#fff" strokeWidth="1" opacity=".35" />
      <line x1="8" y1="146" x2="292" y2="146" stroke="#fff" strokeWidth="1" opacity=".35" />
      <rect x="95" y="4" width="110" height="26" fill="none" stroke="#fff" strokeWidth="1" opacity=".3" />
      <circle cx="150" cy="146" r="22" fill="none" stroke="#fff" strokeWidth="1" opacity=".3" />
      {weak === danger ? band(weak, '#fbbf24', 'both') : [band(weak, '#10e08a', 'w'), band(danger, '#ef4444', 'd')]}
      {rows.map(([y, xs], r) =>
        xs.map((x) => (
          <g key={`${r}-${x}`}>
            <circle cx={x + 1} cy={y + 2} r="8" fill="#000" opacity=".3" />
            <circle cx={x} cy={y} r="8" fill={color} stroke="#fff" strokeWidth="1.2" />
          </g>
        )),
      )}
      {/* your attack comes from below */}
      <motion.path d="M150 140V128" stroke="#10e08a" strokeWidth="3" strokeLinecap="round" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }} />
      <path d="M144 132L150 124L156 132" fill="none" stroke="#10e08a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function effectText(e: Effect, t: (k: string, v?: Record<string, string | number>) => string) {
  switch (e.kind) {
    case 'attack':
      return t('Your chances +{n}%', { n: e.n });
    case 'defence':
      return t('Their chances −{n}%', { n: e.n });
    case 'start':
      return t('Flying start +{n}', { n: e.n });
    default:
      return t('Fatigue −{n}', { n: e.n });
  }
}

/**
 * Match-day training: read the scouting report on the opponent, pick the drill that answers it, and play it.
 * What you do in the session is what you take into the match.
 */
export function TrainingGround({
  seed,
  oppName,
  oppColor,
  diff,
  attrs,
  kit,
  oppKit,
  onPick,
}: {
  seed: string;
  oppName: string;
  oppColor: string;
  /** Your strength minus theirs */
  diff: number;
  attrs: Attributes;
  kit: string;
  oppKit: string;
  onPick: (o: RitualOption) => void;
}) {
  const t = useT();
  const report = useMemo(() => scoutReport(`${seed}|${oppName}`, diff), [seed, oppName, diff]);
  const [active, setActive] = useState<Drill | null>(null);
  const [done, setDone] = useState<{ drill: Drill; q: MiniQuality | null; effects: Effect[]; scouted: boolean } | null>(null);

  const answers = (d: Drill) => (report.weak.drill === d.id ? 'weak' : report.danger.drill === d.id ? 'danger' : null);
  // the harder the opponent, the harder the drill — but always a little kinder than the match itself
  const difficulty = Math.max(0, Math.min(1, (0.38 - diff / 15) * 0.75));

  const start = (d: Drill) => {
    if (done) return;
    if (d.id === 'rest') {
      const out = trainOutcome(d, 'good', false, seed);
      setDone({ drill: d, q: null, effects: out.effects, scouted: false });
      onPick(out.option);
      return;
    }
    setActive(d);
  };

  const finish = (q: MiniQuality) => {
    if (!active) return;
    const scouted = answers(active) !== null;
    const out = trainOutcome(active, q, scouted, seed);
    setDone({ drill: active, q, effects: out.effects, scouted });
    onPick(out.option);
    setActive(null);
  };

  const kind = active ? gameFor(active, seed) : null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 className="eyebrow">{t('Match-day training')}</h2>
        <span className="text-[11px] font-semibold text-zinc-500">{done ? t('Session done') : t('One session')}</span>
      </div>

      {/* the scouting report */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="flex items-center gap-2 px-3.5 pt-3 text-[13px] font-bold">
          <Eye className="h-4 w-4 text-gold-300" aria-hidden />
          {t('Scouting report: {opp}', { opp: oppName })}
        </div>
        <div className="mt-2">
          <Board color={oppColor} weak={report.weak.zone} danger={report.danger.zone} />
        </div>
        <div className="space-y-2 px-3.5 py-3">
          {[report.weak, report.danger].map((tr) => (
            <div key={tr.id} className="flex items-start gap-2.5">
              {tr.kind === 'weak' ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neon-300" aria-hidden /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-crimson-400" aria-hidden />}
              <div className="text-[12px] leading-snug">
                <b className={tr.kind === 'weak' ? 'text-neon-300' : 'text-crimson-400'}>{t(tr.label)}</b>
                <span className="text-zinc-400"> — {t(tr.line)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mb-2 mt-3.5 px-0.5 text-[15px] font-semibold leading-snug text-zinc-100">
        {done ? t('The session is done. Time to go out.') : t('Pick the drill that answers the report.')}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {DRILLS.map((d, i) => {
          const ans = answers(d);
          const chosen = done?.drill.id === d.id;
          return (
            <motion.button
              key={d.id}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: done && !chosen ? 0.45 : 1 }}
              transition={{ delay: 0.05 * i }}
              whileTap={done ? undefined : { scale: 0.96 }}
              onClick={() => start(d)}
              disabled={!!done}
              className={cn(
                'gloss-edge relative flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-all',
                d.id === 'rest' && 'col-span-2',
                chosen ? 'border-neon-400/60 bg-neon-400/10 shadow-neon' : ans ? (ans === 'weak' ? 'border-neon-400/35 bg-neon-400/[0.05]' : 'border-crimson-500/30 bg-crimson-500/[0.05]') : 'border-white/[0.08] bg-white/[0.04]',
              )}
            >
              <div className="flex items-center gap-2">
                <GameIcon e={d.emoji} className="h-6 w-6 text-gold-300" />
                <span className="text-[14px] font-bold leading-tight">{t(d.name)}</span>
              </div>
              <p className="text-[11px] leading-snug text-zinc-400">{t(d.blurb)}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                {ans && (
                  <Chip tone={ans === 'weak' ? 'good' : 'bad'}>
                    {t('Answers the report')} ×{SCOUTED}
                  </Chip>
                )}
                {d.attr && <Chip tone="neutral">+ {t(ATTR_LABEL[d.attr])}</Chip>}
              </div>
              {chosen && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neon-400 text-black">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {done && (
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
            {done.q && <div className={cn('font-display text-xl font-extrabold uppercase leading-none', QUALITY_TONE[done.q])}>{t(QUALITY_TITLE[done.q])}</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {done.effects.map((e) => (
                <Chip key={e.kind} tone="good">
                  {effectText(e, t)}
                </Chip>
              ))}
              {done.scouted && <Chip tone="gold">{t('Scouted')} ×{SCOUTED}</Chip>}
              {done.drill.attr && done.q && <Chip tone="info">+ {t(ATTR_LABEL[done.drill.attr])}</Chip>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the session itself: the real mini-game */}
      <Sheet open={!!active && !!kind} className="max-h-[94dvh] overflow-y-auto">
        {active && kind && (
          <MiniGame
            key={`${seed}-${active.id}`}
            kind={kind}
            skill={skillFor(kind, attrs)}
            pressure={0.1}
            difficulty={difficulty}
            kit={kit}
            oppKit={oppKit}
            eyebrow={t('Training: {drill}', { drill: t(active.name) })}
            onDone={(q) => finish(q)}
          />
        )}
      </Sheet>
    </div>
  );
}
