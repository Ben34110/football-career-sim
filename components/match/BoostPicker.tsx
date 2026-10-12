'use client';

import { motion } from 'framer-motion';
import { Check, Coins } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Card';
import { GameIcon } from '@/components/ui/GameIcon';
import { Sheet } from '@/components/ui/Sheet';
import { WaitScreen } from '@/components/ui/WaitScreen';
import { BOOSTS, boostPrice, type BoostDef } from '@/lib/data/boosts';
import { fmtMoneyK } from '@/lib/engine/player';
import { useBoostPurchase } from '@/lib/hooks';
import { useLang, useT } from '@/lib/i18n';
import { formatEur, isTestPayments, paymentsAvailable } from '@/lib/payments';
import { useGameStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const pct = (mul: number) => Math.round(Math.abs(mul - 1) * 100);

/** What a boost does, as short chips. */
export function boostEffects(b: BoostDef, t: (k: string, v?: Record<string, string | number>) => string): string[] {
  const e = b.effect;
  const out: string[] = [];
  if (e.myRateMul && e.myRateMul !== 1) out.push(t('Your chances +{n}%', { n: pct(e.myRateMul) }));
  if (e.oppRateMul && e.oppRateMul !== 1) out.push(t('Their chances −{n}%', { n: pct(e.oppRateMul) }));
  if (e.clutchBonus) out.push(t('Big moments +{n}%', { n: Math.round(e.clutchBonus * 100) }));
  if (e.momentum) out.push(t('Flying start +{n}', { n: e.momentum }));
  if (e.perf) out.push(t('Form +{n}', { n: e.perf }));
  if (b.morale) out.push(t('Morale +{n}', { n: b.morale }));
  return out;
}

/**
 * The last thing before kick-off: spend a boost on this match, or get one. Boosts come from the game money (steep) or
 * from real money; one can be used per match.
 */
export function BoostPicker({ selected, onSelect, recommended }: { selected: string | null; onSelect: (id: string | null) => void; recommended: string[] }) {
  const t = useT();
  const { lang } = useLang();
  const player = useGameStore((s) => s.player);
  const { busy, withMoney, withEuros } = useBoostPurchase();
  const [buying, setBuying] = useState<BoostDef | null>(null);
  if (!player) return null;

  const wage = player.contract?.wage ?? 4;
  const owned = (id: string) => player.boosts?.[id] ?? 0;
  const available = paymentsAvailable();

  const pick = (b: BoostDef) => {
    if (owned(b.id) > 0) onSelect(selected === b.id ? null : b.id);
    else setBuying(b);
  };

  const bought = (b: BoostDef, ok: boolean) => {
    if (!ok) return;
    setBuying(null);
    onSelect(b.id);
  };

  const full = buying ? owned(buying.id) >= 9 : false;
  const price = buying ? boostPrice(buying, wage) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="eyebrow">{t('Boost')}</h2>
        <span className="text-[11px] font-semibold text-zinc-500">{selected ? t('One boost in play') : t('Optional · one per match')}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {BOOSTS.map((b, i) => {
          const n = owned(b.id);
          const on = selected === b.id;
          return (
            <motion.button
              key={b.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.04 * i }}
              whileTap={{ scale: 0.97 }}
              onClick={() => pick(b)}
              aria-pressed={on}
              className={cn(
                'gloss-edge relative flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-colors',
                on ? 'border-gold-400/60 bg-gold-400/10 shadow-gold' : 'border-white/[0.08] bg-white/[0.04]',
              )}
            >
              <div className="flex items-center gap-2 pr-5">
                <GameIcon e={b.emoji} className="h-6 w-6 shrink-0 text-gold-300" />
                <span className="text-[14px] font-bold leading-tight">{t(b.name)}</span>
              </div>
              <p className="text-[11px] leading-snug text-zinc-400">{t(b.desc)}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                {recommended.includes(b.id) && <Chip tone="good">{t('Recommended')}</Chip>}
                {n > 0 ? <Chip tone="gold">×{n}</Chip> : <Chip tone="neutral">{t('Get it')}</Chip>}
              </div>
              {on && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-black">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {busy !== null && <WaitScreen variant="overlay" message="Processing your purchase…" />}

      <Sheet open={!!buying} dismissible onClose={() => setBuying(null)}>
        {buying && (
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
                <GameIcon e={buying.emoji} className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <div className="font-display text-2xl font-extrabold uppercase leading-none">{t(buying.name)}</div>
                <p className="mt-1 text-xs leading-snug text-zinc-400">{t(buying.desc)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {boostEffects(buying, t).map((e) => (
                <Chip key={e} tone="good">
                  {e}
                </Chip>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              <Button block variant={player.money >= price ? 'gold' : 'ghost'} disabled={full || player.money < price || busy !== null} onClick={() => bought(buying, withMoney(buying.id))}>
                <Coins className="h-4 w-4" /> {t('Buy with game money')} · {fmtMoneyK(price)}
              </Button>
              <p className="-mt-1 px-1 text-center text-[11px] text-zinc-500">{t('You have {money}.', { money: fmtMoneyK(player.money) })}</p>
              <Button
                block
                variant="ghost"
                disabled={full || !available || busy !== null}
                onClick={async () => bought(buying, await withEuros(buying.id))}
              >
                {t('Buy for {price}', { price: formatEur(buying.priceEur, lang) })}
              </Button>
              {!available && <p className="text-center text-[11px] text-zinc-500">{t('Real-money purchases arrive with the App Store version.')}</p>}
              {isTestPayments() && <p className="text-center text-[11px] font-semibold text-gold-300">{t('Test mode: no real payment is made.')}</p>}
              {full && <p className="text-center text-[11px] text-zinc-500">{t('You can only carry 9 of each boost.')}</p>}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
