'use client';

import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { rankGroup } from '@/lib/engine/tournament';
import { useT } from '@/lib/i18n';
import type { TournamentState, TournamentTie } from '@/lib/types';
import { cn } from '@/lib/utils';

const GROUP_LETTERS = ['A', 'B', 'C', 'D'];

/** Groups of four and the road to the final: every nation, every score. */
export function TournamentView({ tourney, name }: { tourney: TournamentState; name: string }) {
  const t = useT();
  if (!tourney.drawn) {
    return (
      <Card className="p-4 text-sm text-zinc-400">
        <div className="eyebrow mb-1">{t(name)}</div>
        {t('The group draw has not happened yet. It takes place before your first match.')}
      </Card>
    );
  }
  const groups = tourney.groups.map((_, g) => g);
  // your group first
  const order = [tourney.myGroup, ...groups.filter((g) => g !== tourney.myGroup)];
  const teamLabel = (n: string) => (n ? `${tourney.teams[n]?.short.split(' ')[0] ?? ''} ${t(n)}` : '—');
  return (
    <div className="space-y-3">
      <div className="px-1">
        <div className="eyebrow text-gold-300">{t(name)}</div>
        {tourney.champion && (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gold-200">
            <Trophy className="h-4 w-4" /> {t('Champions: {team}', { team: t(tourney.champion) })}
          </p>
        )}
      </div>

      {tourney.rounds.length > 0 && (
        <Card className="p-4">
          <div className="eyebrow mb-3">{t('Road to the final')}</div>
          <div className="space-y-3">
            {tourney.rounds.map((r) => (
              <div key={r.label}>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t(r.label)}</div>
                <div className="space-y-1.5">
                  {r.ties.map((x, i) => (
                    <TieRow key={i} x={x} me={tourney.me} label={teamLabel} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {order.map((g) => {
        const rows = rankGroup(tourney.groups[g]);
        const done = rows.every((r) => r.played >= 3);
        return (
          <Card key={g} className={cn('overflow-hidden p-0', g === tourney.myGroup && 'border-neon-400/30')}>
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="eyebrow">{t('Group {l}', { l: GROUP_LETTERS[g] })}</span>
              {g === tourney.myGroup && <span className="text-[10px] font-bold uppercase tracking-wider text-neon-300">{t('Your group')}</span>}
            </div>
            <div className="mt-2 grid grid-cols-[18px_1fr_24px_24px_24px_30px_30px] items-center gap-1 border-b border-white/[0.06] px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <span>#</span>
              <span>{t('Team')}</span>
              <span className="text-center">{t('P')}</span>
              <span className="text-center">{t('W')}</span>
              <span className="text-center">{t('D')}</span>
              <span className="text-center">{t('GD')}</span>
              <span className="text-right">{t('Pts')}</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                style={i < 2 && done ? { boxShadow: 'inset 3px 0 0 #34d399' } : i < 2 ? { boxShadow: 'inset 3px 0 0 rgba(52,211,153,0.35)' } : undefined}
                className={cn('grid grid-cols-[18px_1fr_24px_24px_24px_30px_30px] items-center gap-1 px-3 py-2 text-[12.5px]', r.isMe ? 'bg-neon-400/10 font-bold text-neon-300' : 'border-t border-white/[0.04] text-zinc-300')}
              >
                <span className="font-num text-zinc-500">{i + 1}</span>
                <span className="truncate">{teamLabel(r.name)}</span>
                <span className="font-num text-center">{r.played}</span>
                <span className="font-num text-center">{r.won}</span>
                <span className="font-num text-center">{r.drawn}</span>
                <span className="font-num text-center">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</span>
                <span className="font-num text-right text-sm font-extrabold">{r.pts}</span>
              </div>
            ))}
          </Card>
        );
      })}
      <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-400">
        <span className="h-2.5 w-1 rounded-full bg-neon-400" /> {t('Top two of each group reach the quarter-finals')}
      </div>
    </div>
  );
}

function TieRow({ x, me, label }: { x: TournamentTie; me: string; label: (n: string) => string }) {
  const played = x.winner !== undefined;
  const mine = x.a === me || x.b === me;
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px]', mine ? 'bg-neon-400/10' : 'bg-white/[0.04]')}>
      <span className={cn('min-w-0 flex-1 truncate', played && x.winner === x.a ? 'font-bold text-zinc-50' : 'text-zinc-400', x.a === me && 'text-neon-300')}>{label(x.a)}</span>
      <span className="font-num shrink-0 text-center text-[13px] font-extrabold text-zinc-100">
        {played ? (
          <>
            {x.ga}–{x.gb}
            {x.pens && <span className="ml-1 text-[10px] font-semibold text-zinc-500">({x.pens[0]}–{x.pens[1]})</span>}
          </>
        ) : (
          'vs'
        )}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-right', played && x.winner === x.b ? 'font-bold text-zinc-50' : 'text-zinc-400', x.b === me && 'text-neon-300')}>{label(x.b)}</span>
    </div>
  );
}
