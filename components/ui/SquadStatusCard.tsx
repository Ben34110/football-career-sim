'use client';

import { Armchair, Check, Circle, Crown, KeyRound, Shirt, Sparkles, Sprout, Star, Trophy, UserPlus, UserRound, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { squadStatus, type SquadStatusId } from '@/lib/engine/status';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export const STATUS_META: Record<SquadStatusId, { icon: LucideIcon; label: string; line: string; tone: string }> = {
  free: { icon: UserRound, label: 'Free agent', line: 'No club, no role: sign somewhere to earn a place.', tone: 'text-zinc-300' },
  newcomer: { icon: UserPlus, label: 'Newcomer', line: 'New in the dressing room: you still have to prove yourself.', tone: 'text-sky-300' },
  marquee: { icon: Sparkles, label: 'Marquee signing', line: 'The club paid for a star: everyone expects a lot of you.', tone: 'text-gold-300' },
  prospect: { icon: Sprout, label: 'Young prospect', line: 'A talent to watch: the club is patient with you.', tone: 'text-neon-300' },
  rotation: { icon: Armchair, label: 'Squad player', line: 'You come on from the bench: earn the coach’s trust.', tone: 'text-zinc-300' },
  starter: { icon: Shirt, label: 'Regular starter', line: 'You are in the team week after week.', tone: 'text-neon-300' },
  key: { icon: KeyRound, label: 'Key player', line: 'The team plays through you.', tone: 'text-gold-300' },
  star: { icon: Star, label: 'Star of the team', line: 'The fans come to see you. The coach builds around you.', tone: 'text-gold-300' },
  captain: { icon: Crown, label: 'Captain', line: 'You wear the armband: the dressing room follows you.', tone: 'text-gold-300' },
  legend: { icon: Trophy, label: 'Club legend', line: 'Your name will be sung here for years.', tone: 'text-gold-200' },
};

const PART_LABEL = { skill: 'Level in the squad', trust: 'Coach trust', room: 'Dressing room', fans: 'Fans', tenure: 'Time at the club' } as const;

/** Where you stand in your team: your role, your influence, and what the next role asks for. */
export function SquadStatusCard({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const player = useGameStore((s) => s.player);
  const history = useGameStore((s) => s.history);
  if (!player) return null;
  const st = squadStatus(player, history);
  const meta = STATUS_META[st.id];
  const Icon = meta.icon;

  if (compact) {
    return (
      <Card className="flex items-center gap-3 px-4 py-2.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06]', meta.tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('Your role')}</div>
          <div className="truncate text-sm font-bold">{t(meta.label)}</div>
        </div>
        <div className="text-right">
          <div className="font-num text-lg font-extrabold">{st.influence}</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t('Influence')}</div>
        </div>
      </Card>
    );
  }

  const goalText = (g: { id: string; value: number; target: number }) =>
    g.id === 'influence' ? t('Influence {v}/{t}', { v: g.value, t: g.target }) : g.id === 'seasons' ? t('Seasons at the club {v}/{t}', { v: g.value, t: g.target }) : g.id === 'room' ? t('Dressing room {v}/{t}', { v: g.value, t: g.target }) : t('Fans {v}/{t}', { v: g.value, t: g.target });

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02]', meta.tone)}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('Your role in the squad')}</div>
          <div className="font-display text-2xl font-extrabold uppercase leading-none">{t(meta.label)}</div>
          <p className="mt-1 text-xs leading-snug text-zinc-400">{t(meta.line)}</p>
        </div>
        <div className="text-right">
          <div className="font-num text-3xl font-extrabold leading-none">{st.influence}</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t('Influence')}</div>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-neon-400 to-gold-300" style={{ width: `${st.influence}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {(Object.keys(PART_LABEL) as (keyof typeof PART_LABEL)[]).map((k) => (
          <div key={k}>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-zinc-300/70" style={{ width: `${Math.round(st.parts[k])}%` }} />
            </div>
            <div className="mt-1 text-[8.5px] font-semibold uppercase leading-tight tracking-wide text-zinc-500">{t(PART_LABEL[k])}</div>
          </div>
        ))}
      </div>

      {st.next && (
        <div className="mt-3.5 rounded-xl border border-white/[0.08] bg-black/20 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            {t('Next role')}: <span className="text-zinc-100">{t(STATUS_META[st.next.id].label)}</span>
          </div>
          <div className="mt-1.5 space-y-1">
            {st.next.goals.map((g) => (
              <div key={g.id} className={cn('flex items-center gap-1.5 text-xs', g.ok ? 'text-neon-300' : 'text-zinc-400')}>
                {g.ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />} {goalText(g)}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
