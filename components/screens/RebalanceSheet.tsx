'use client';

import { ArrowRight, Brain, Eye, Flame, Minus, Plus, Target, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { ATTR_KEYS, ATTR_LABEL, calcOvr, fmtMoneyK, pointsMoved, REBALANCE_MAX, REBALANCE_MIN, rebalanceCostPerPoint } from '@/lib/engine/player';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { AttrKey, Attributes } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICON: Record<AttrKey, LucideIcon> = { finishing: Target, composure: Brain, vision: Eye, stamina: Flame };

/** Take points from a strong attribute and put them where the player is weak. The total never changes. */
export function RebalanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const player = useGameStore((s) => s.player);
  const rebalance = useGameStore((s) => s.rebalanceAttrs);
  const [draft, setDraft] = useState<Attributes | null>(null);

  useEffect(() => {
    if (open && player) setDraft({ ...player.attrs });
  }, [open, player?.attrs]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = useMemo(() => {
    if (!player || !draft) return null;
    const pool = ATTR_KEYS.reduce((s, k) => s + player.attrs[k] - draft[k], 0);
    const moved = pointsMoved(player.attrs, draft);
    const perPoint = rebalanceCostPerPoint(player.contract?.wage ?? 4);
    const xp = { ...player.xp };
    for (const k of ATTR_KEYS) if (draft[k] < player.attrs[k]) xp[k] = 0;
    return {
      pool,
      moved,
      cost: moved * perPoint,
      perPoint,
      before: calcOvr(player.attrs, player.position, player.xp),
      after: calcOvr(draft, player.position, xp),
    };
  }, [player, draft]);

  if (!player || !draft || !info) return <Sheet open={false}>{null}</Sheet>;

  const step = (k: AttrKey, d: number) => {
    // a point leaves one attribute and waits in the pool until another one takes it
    if (d > 0 && (info.pool < d || draft[k] + d > REBALANCE_MAX)) return;
    if (d < 0 && draft[k] + d < REBALANCE_MIN) return;
    haptic(8);
    setDraft({ ...draft, [k]: draft[k] + d });
  };
  const canConfirm = info.pool === 0 && info.moved > 0 && player.money >= info.cost;

  return (
    <Sheet open={open} dismissible onClose={onClose} className="max-h-[90dvh] overflow-y-auto">
      <div className="space-y-4">
        <div>
          <div className="eyebrow text-gold-300">{t('Retraining')}</div>
          <h3 className="font-display text-3xl font-extrabold uppercase leading-none">{t('Rebalance your attributes')}</h3>
          <p className="mt-1.5 text-sm text-zinc-400">{t('Take points from what you are strong at and give them to what you are weak at. The total stays the same.')}</p>
        </div>

        <div className={cn('flex items-center justify-between rounded-2xl border px-4 py-3', info.pool > 0 ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/10 bg-white/[0.04]')}>
          <span className="text-sm font-semibold text-zinc-300">{t('Points to assign')}</span>
          <span className={cn('font-num text-3xl font-extrabold', info.pool > 0 ? 'text-gold-300' : 'text-zinc-500')}>{info.pool}</span>
        </div>

        <div className="space-y-2">
          {ATTR_KEYS.map((k) => {
            const Icon = ICON[k];
            const delta = draft[k] - player.attrs[k];
            return (
              <div key={k} className="glass flex items-center gap-3 px-3 py-2.5">
                <Icon className="h-5 w-5 shrink-0 text-neon-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{t(ATTR_LABEL[k])}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full transition-all', delta > 0 ? 'bg-neon-400' : delta < 0 ? 'bg-crimson-500' : 'bg-zinc-400')} style={{ width: `${draft[k]}%` }} />
                  </div>
                </div>
                <div className="w-14 text-center">
                  <div className="font-num text-2xl font-extrabold leading-none">{draft[k]}</div>
                  <div className={cn('text-[10px] font-bold', delta > 0 ? 'text-neon-300' : delta < 0 ? 'text-crimson-400' : 'text-transparent')}>{delta > 0 ? `+${delta}` : delta < 0 ? delta : '·'}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => step(k, -1)} onContextMenu={(e) => e.preventDefault()} aria-label={`${t(ATTR_LABEL[k])} −1`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] active:scale-90 disabled:opacity-30" disabled={draft[k] <= REBALANCE_MIN}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <button onClick={() => step(k, 1)} aria-label={`${t(ATTR_LABEL[k])} +1`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] active:scale-90 disabled:opacity-30" disabled={info.pool < 1 || draft[k] >= REBALANCE_MAX}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
          <span className="text-zinc-400">{t('Overall')}</span>
          <span className="flex items-center gap-2 font-num text-lg font-extrabold">
            {info.before} <ArrowRight className="h-4 w-4 text-zinc-500" />
            <span className={info.after > info.before ? 'text-neon-300' : info.after < info.before ? 'text-crimson-400' : ''}>{info.after}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="gold">
            {t('Cost')} {fmtMoneyK(info.cost)}
          </Chip>
          <span className="text-[11px] text-zinc-500">{t('{n} per point moved', { n: fmtMoneyK(info.perPoint) })}</span>
          {player.money < info.cost && <Chip tone="bad">{t('Not enough money')}</Chip>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => setDraft({ ...player.attrs })} disabled={info.moved === 0 && info.pool === 0}>
            {t('Reset')}
          </Button>
          <Button
            disabled={!canConfirm}
            onClick={() => {
              const r = rebalance(draft);
              toast(r.msg, r.ok ? 'good' : 'bad');
              if (r.ok) onClose();
            }}
          >
            {t('Confirm')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
