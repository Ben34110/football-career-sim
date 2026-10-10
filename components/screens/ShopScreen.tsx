'use client';

import { motion } from 'framer-motion';
import { Coins, Gift, HeartPulse, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Bolts } from '@/components/ui/Bolts';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { BOOSTS, boostPrice } from '@/lib/data/boosts';
import { galaCost, levelOf, MAX_UPGRADE_LEVEL, UPGRADES, upgradeCost } from '@/lib/data/shop';
import { fmtMoneyK } from '@/lib/engine/player';
import { useEnergy } from '@/lib/hooks';
import { useLang, useT } from '@/lib/i18n';
import { formatEur, getPaymentProvider, isTestPayments, LIFE_PACKS, paymentsAvailable, type LifePack } from '@/lib/payments';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { cn, fmtCountdown } from '@/lib/utils';

export function ShopScreen() {
  const t = useT();
  const { lang } = useLang();
  const player = useGameStore((s) => s.player);
  const year = useGameStore((s) => s.year);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const buyBoost = useGameStore((s) => s.buyBoost);
  const donate = useGameStore((s) => s.donate);
  const physio = useGameStore((s) => s.physio);
  const grantLives = useGameStore((s) => s.grantLives);
  const { bolts, msToNext } = useEnergy();
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'lives' | 'boosts' | 'upgrades'>('lives');
  if (!player) return null;

  const wage = player.contract?.wage ?? 4;
  const gala = galaCost(wage);
  const galaDone = player.donatedYear === year;
  const available = paymentsAvailable();

  const buyPack = async (pack: LifePack) => {
    setBusy(pack.id);
    const r = await getPaymentProvider().purchase(pack);
    setBusy(null);
    if (r.ok) {
      grantLives(pack.lives);
      toast(t('+{n} lives added!', { n: pack.lives }), 'good');
    } else {
      toast(t('Purchase unavailable right now.'), 'bad');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">{t('Club shop')}</div>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{t('Shop')}</h1>
      </div>

      <Card gold className="flex items-center gap-3 p-4">
        <Coins className="h-6 w-6 text-gold-300" />
        <div className="flex-1">
          <div className="eyebrow">{t('Savings')}</div>
          <div className="font-num text-2xl font-extrabold text-gold-300">{fmtMoneyK(player.money)}</div>
        </div>
        <p className="max-w-[150px] text-right text-[11px] leading-snug text-zinc-400">{t('You earn money every match. Spend it on lasting upgrades.')}</p>
      </Card>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1" role="tablist">
        {(
          [
            ['lives', '❤️', 'Lives'],
            ['boosts', '⚡', 'Boosts'],
            ['upgrades', '🏆', 'Upgrades'],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('h-10 rounded-xl text-[13px] font-bold transition-colors', tab === id ? 'bg-gradient-to-b from-gold-300 to-gold-500 text-zinc-950' : 'text-zinc-400')}
          >
            {icon} {t(label)}
          </button>
        ))}
      </div>

      {tab === 'lives' && (
        <>
      <div>
        <SectionTitle right={<Bolts bolts={bolts} msToNext={msToNext} showTimer size="sm" />}>{t('Lives')}</SectionTitle>
        <Card className="space-y-3 p-4">
          <p className="text-xs leading-snug text-zinc-400">{t('Each match costs one life. You get one back every 2 minutes (up to 5). Need more now?')}</p>
          {bolts < 5 && msToNext > 0 && <p className="text-xs font-semibold text-zinc-300">{t('Next life in {time}', { time: fmtCountdown(msToNext) })}</p>}
          <div className="grid grid-cols-2 gap-2.5">
            {LIFE_PACKS.map((pack) => (
              <motion.button
                key={pack.id}
                whileTap={{ scale: 0.97 }}
                disabled={!available || busy !== null}
                onClick={() => buyPack(pack)}
                className={cn(
                  'gloss-edge rounded-2xl border p-3 text-left transition-opacity disabled:opacity-50',
                  pack.id === 'lives_15' ? 'border-gold-400/50 bg-gold-400/10' : 'border-white/[0.1] bg-white/[0.05]',
                )}
              >
                <div className="flex items-center gap-1.5 font-display text-3xl font-extrabold">
                  <HeartPulse className="h-5 w-5 text-crimson-400" /> {pack.lives}
                </div>
                <div className="text-[11px] text-zinc-400">{t('lives')}</div>
                <div className="mt-2 font-num text-lg font-bold text-gold-300">{formatEur(pack.priceEur, lang)}</div>
                {pack.id === 'lives_15' && <Chip tone="gold">{t('Best value')}</Chip>}
              </motion.button>
            ))}
          </div>
          {!available && <p className="text-center text-[11px] text-zinc-500">{t('Life packs arrive with the App Store version.')}</p>}
          {isTestPayments() && <p className="text-center text-[11px] font-semibold text-gold-300">{t('Test mode: no real payment is made.')}</p>}
          <Button
            block
            variant="ghost"
            size="sm"
            onClick={() => {
              const r = physio();
              toast(r.msg, r.ok ? 'good' : 'bad');
            }}
          >
            <HeartPulse className="h-4 w-4 text-crimson-400" /> {t('Recovery clinic · +2 lives')} ({fmtMoneyK(wage * 3)})
          </Button>
        </Card>
      </div>

        </>
      )}

      {tab === 'boosts' && (
        <>
      <div>
        <SectionTitle>{t('Match-day boosts')}</SectionTitle>
        <Card className="divide-y divide-white/[0.06] p-0">
          {BOOSTS.map((b) => {
            const price = boostPrice(b, wage);
            const owned = player.boosts?.[b.id] ?? 0;
            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl">{b.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">
                    {t(b.name)} {owned > 0 && <span className="ml-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-[11px] font-bold text-gold-300">×{owned}</span>}
                  </div>
                  <div className="text-xs text-zinc-400">{t(b.desc)}</div>
                </div>
                <Button
                  size="sm"
                  variant={player.money >= price ? 'gold' : 'ghost'}
                  disabled={player.money < price}
                  onClick={() => {
                    const r = buyBoost(b.id);
                    toast(r.msg, r.ok ? 'good' : 'bad');
                  }}
                >
                  {fmtMoneyK(price)}
                </Button>
              </div>
            );
          })}
        </Card>
        <p className="mt-2 px-1 text-[11px] text-zinc-500">{t('Use one before kick-off. Small edge, one per match.')}</p>
      </div>

        </>
      )}

      {tab === 'upgrades' && (
        <>
      <div>
        <SectionTitle>{t('Upgrades')}</SectionTitle>
        <div className="space-y-3">
          {UPGRADES.map((def) => {
            const level = levelOf(player, def.id);
            const cost = upgradeCost(def, level, wage);
            const affordable = cost !== null && player.money >= cost;
            return (
              <Card key={def.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold">{t(def.name)}</div>
                    <div className="mt-1 flex gap-1">
                      {Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) => (
                        <span key={i} className={cn('h-1.5 w-7 rounded-full', i < level ? 'bg-gold-400' : 'bg-white/10')} />
                      ))}
                    </div>
                  </div>
                  {cost === null ? (
                    <Chip tone="gold">{t('Max')}</Chip>
                  ) : (
                    <Button
                      size="sm"
                      variant={affordable ? 'gold' : 'ghost'}
                      disabled={!affordable}
                      onClick={() => {
                        const r = buyUpgrade(def.id);
                        toast(r.msg, r.ok ? 'good' : 'bad');
                      }}
                    >
                      {fmtMoneyK(cost)}
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {level > 0 && <span className="font-semibold text-zinc-200">{t(def.levels[level - 1])}</span>}
                  {level > 0 && level < MAX_UPGRADE_LEVEL && ' → '}
                  {level < MAX_UPGRADE_LEVEL && <span>{t('Next')}: {t(def.levels[level])}</span>}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

        </>
      )}

      {tab === 'upgrades' && (
        <>
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-400/15 text-gold-300">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">{t('Charity gala')}</div>
          <p className="text-xs text-zinc-400">{t('Once a season: more fans, a better dressing room and good press.')}</p>
        </div>
        <Button
          size="sm"
          variant={galaDone || player.money < gala ? 'ghost' : 'gold'}
          disabled={galaDone || player.money < gala}
          onClick={() => {
            const r = donate();
            toast(r.msg, r.ok ? 'good' : 'bad');
          }}
        >
          {galaDone ? <Sparkles className="h-4 w-4" /> : fmtMoneyK(gala)}
        </Button>
      </Card>
        </>
      )}
    </div>
  );
}
