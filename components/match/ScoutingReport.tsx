'use client';

import { motion } from 'framer-motion';
import { Eye, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { Chip } from '@/components/ui/Card';
import { EXPECTATION_TARGET } from '@/lib/data/speeches';
import { buildScouting, type FormResult, type Zone } from '@/lib/data/scouting';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type Scouting = ReturnType<typeof buildScouting>;

const FORM_STYLE: Record<FormResult, string> = {
  W: 'border-neon-400/50 bg-neon-400/15 text-neon-300',
  D: 'border-white/15 bg-white/[0.07] text-zinc-300',
  L: 'border-crimson-500/50 bg-crimson-500/15 text-crimson-400',
};
/** "W|form" etc. only exist to give the French letters (V / N / D) */
const FORM_KEY: Record<FormResult, string> = { W: 'W|form', D: 'D|form', L: 'L|form' };

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
        <linearGradient id="sr-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14562f" />
          <stop offset="1" stopColor="#0d4224" />
        </linearGradient>
      </defs>
      <rect width="300" height="150" fill="url(#sr-grass)" />
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

/**
 * The pre-match scouting report: the opponent's level and recent form, the players to watch, their weak point and their
 * danger, and what the club expects from you. Information only — what you do about it is the boost.
 */
export function ScoutingReport({
  oppName,
  oppColor,
  oppStrength,
  myStrength,
  scouting,
}: {
  oppName: string;
  oppColor: string;
  oppStrength: number;
  myStrength: number;
  scouting: Scouting;
}) {
  const t = useT();
  const { report, form, players, expected, diff } = scouting;
  const gap = Math.round(-diff);
  const target = EXPECTATION_TARGET[expected.expectation] + expected.target;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 className="eyebrow">{t('Match-day briefing')}</h2>
        <span className="text-[11px] font-semibold text-zinc-500">{t('Scouting report')}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="flex items-center gap-2 px-3.5 pt-3 text-[13px] font-bold">
          <Eye className="h-4 w-4 text-gold-300" aria-hidden />
          {t('Scouting report: {opp}', { opp: oppName })}
        </div>

        {/* level and recent form */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 px-3.5">
          <div className="rounded-xl bg-black/25 px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Their level')}</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-num text-2xl font-extrabold text-zinc-100">{oppStrength}</span>
              <span className="text-[10px] font-bold text-zinc-500">OVR</span>
            </div>
            <div className={cn('mt-0.5 text-[11px] font-semibold', gap > 1 ? 'text-crimson-400' : gap < -1 ? 'text-neon-300' : 'text-zinc-400')}>
              {gap > 1 ? t('{n} above you', { n: gap }) : gap < -1 ? t('{n} below you', { n: -gap }) : t('Same level as you')}
              <span className="font-normal text-zinc-500"> · {t('You')} {Math.round(myStrength)}</span>
            </div>
          </div>
          <div className="rounded-xl bg-black/25 px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Their last matches')}</div>
            <div className="mt-1.5 flex gap-1" aria-label={form.join(' ')}>
              {form.map((r, i) => (
                <span key={i} className={cn('flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-extrabold', FORM_STYLE[r])}>
                  {t(FORM_KEY[r])}
                </span>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              {t('{n} wins in {m}', { n: form.filter((r) => r === 'W').length, m: form.length })}
            </div>
          </div>
        </div>

        {/* the board: weak point green, danger red */}
        <div className="mt-3">
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

        {/* players to watch */}
        <div className="border-t border-white/[0.06] px-3.5 py-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Players to watch')}</div>
          <div className="space-y-2">
            {players.map((p) => (
              <div key={p.name} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[11px] font-extrabold text-zinc-300">{p.pos}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold leading-tight">
                    {p.name} <span className="text-[11px] font-semibold text-gold-300">· {t(p.role)}</span>
                  </div>
                  <div className="truncate text-[11px] text-zinc-400">{t(p.line)}</div>
                </div>
                <span className="font-num text-lg font-extrabold text-zinc-100">{p.ovr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* what awaits you */}
        <div className="border-t border-white/[0.06] bg-black/20 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden />
            <div className="min-w-0 flex-1 text-[12px] leading-snug">
              <b className="text-zinc-100">{t('What awaits you')}</b>
              <span className="text-zinc-400"> — {t(expected.outlook)}</span>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Chip tone="gold">{t('Expected: a {r}+ rating', { r: target.toFixed(1) })}</Chip>
                <Chip tone="neutral">{t(expected.expectation)}</Chip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
