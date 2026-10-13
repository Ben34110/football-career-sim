'use client';

import { motion } from 'framer-motion';
import { Coins, Gift, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Bolts } from '@/components/ui/Bolts';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { AdButton } from '@/components/ui/AdButton';
import { WaitScreen } from '@/components/ui/WaitScreen';
import { BOOSTS, boostPrice } from '@/lib/data/boosts';
import { galaCost, levelOf, MAX_UPGRADE_LEVEL, UPGRADES, upgradeCost } from '@/lib/data/shop';
import { fmtMoneyK } from '@/lib/engine/player';
import { useBoostPurchase, useEnergy } from '@/lib/hooks';
import { useLang, useT } from '@/lib/i18n';
import { boostProduct, displayPrice, getPaymentProvider, isTestPayments, LIFE_PASSES, paymentsAvailable, type LifePass } from '@/lib/payments';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { cn, fmtCountdown, fmtHms } from '@/lib/utils';
import { GameIcon } from '@/components/ui/GameIcon';

export function ShopScreen() {
  const t = useT();
  const { lang } = useLang();
  const player = useGameStore((s) => s.player);
  const year = useGameStore((s) => s.year);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const donate = useGameStore((s) => s.donate);
  const grantUnlimited = useGameStore((s) => s.grantUnlimited);
  const { bolts, msToNext, unlimitedMs } = useEnergy();
  const [busy, setBusy] = useState<string | null>(null);
  const boostBuy = useBoostPurchase();
  const [tab, setTab] = useState<'lives' | 'boosts' | 'upgrades'>('lives');
  if (!player) return null;

  const wage = player.contract?.wage ?? 4;
  const gala = galaCost(wage);
  const galaDone = player.donatedYear === year;
  const available = paymentsAvailable();

  const buyPass = async (pass: LifePass) => {
    setBusy(pass.id);
    const r = await getPaymentProvider().purchase(pass);
    setBusy(null);
    if (r.ok) {
      grantUnlimited(pass.hours);
      toast(t('Unlimited lives for {n} h!', { n: pass.hours }), 'good');
    } else if (r.error !== 'cancelled') {
      toast(t('Purchase unavailable right now.'), 'bad');
    }
  };

  return (
    <div className="space-y-5">
      {(busy !== null || boostBuy.busy !== null) && <WaitScreen variant="overlay" message="Processing your purchase…" />}
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
            ['lives', '❤', 'Lives'],
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
            <GameIcon e={icon} className="mr-1 inline h-4 w-4 align-[-0.2em]" /> {t(label)}
          </button>
        ))}
      </div>

      {tab === 'lives' && (
        <>
      <div>
        <SectionTitle right={<Bolts bolts={bolts} msToNext={msToNext} unlimitedMs={unlimitedMs} showTimer size="sm" />}>{t('Lives')}</SectionTitle>
        <Card className="space-y-3 p-4">
          <p className="text-xs leading-snug text-zinc-400">{t('Each match costs one life. You get one back every 3 minutes (up to 5). Need more now?')}</p>
          {unlimitedMs > 0 ? (
            <p className="text-xs font-semibold text-gold-300">{t('Unlimited lives: {time} left', { time: fmtHms(unlimitedMs) })}</p>
          ) : (
            bolts < 5 && msToNext > 0 && <p className="text-xs font-semibold text-zinc-300">{t('Next life in {time}', { time: fmtCountdown(msToNext) })}</p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {LIFE_PASSES.map((pass) => (
              <motion.button
                key={pass.id}
                whileTap={{ scale: 0.97 }}
                disabled={!available || busy !== null}
                onClick={() => buyPass(pass)}
                className={cn(
                  'gloss-edge rounded-2xl border p-3 text-left transition-opacity disabled:opacity-50',
                  pass.hours >= 24 ? 'border-gold-400/50 bg-gold-400/10' : 'border-white/[0.1] bg-white/[0.05]',
                )}
              >
                <div className="flex items-center gap-1.5 font-display text-3xl font-extrabold">
                  <span className="text-gold-300">∞</span> {pass.hours} h
                </div>
                <div className="text-[11px] text-zinc-400">{t('unlimited lives')}</div>
                <div className="mt-2 font-num text-lg font-bold text-gold-300">{displayPrice(pass, lang)}</div>
                {pass.hours >= 24 && <Chip tone="gold">{t('Best value')}</Chip>}
              </motion.button>
            ))}
          </div>
          <AdButton kind="lives" />
          {!available && <p className="text-center text-[11px] text-zinc-500">{t('Unlimited-lives passes arrive with the App Store version.')}</p>}
          {isTestPayments() && <p className="text-center text-[11px] font-semibold text-gold-300">{t('Test mode: no real payment is made.')}</p>}
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
                <GameIcon e={b.emoji} className="h-6 w-6 text-gold-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">
                    {t(b.name)} {owned > 0 && <span className="ml-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-[11px] font-bold text-gold-300">×{owned}</span>}
                  </div>
                  <div className="text-xs text-zinc-400">{t(b.desc)}</div>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                  <Button
                    size="sm"
                    variant={player.money >= price ? 'gold' : 'ghost'}
                    disabled={player.money < price || owned >= 9 || boostBuy.busy !== null}
                    onClick={() => boostBuy.withMoney(b.id)}
                  >
                    {fmtMoneyK(price)}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!available || owned >= 9 || boostBuy.busy !== null} onClick={() => void boostBuy.withEuros(b.id)}>
                    {displayPrice(boostProduct(b), lang)}
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
        <p className="mt-2 px-1 text-[11px] text-zinc-500">{t('Use one before kick-off. Small edge, one per match.')}</p>
        {!available && <p className="mt-1 px-1 text-[11px] text-zinc-500">{t('Real-money purchases arrive with the App Store version.')}</p>}
        {isTestPayments() && <p className="mt-1 px-1 text-[11px] font-semibold text-gold-300">{t('Test mode: no real payment is made.')}</p>}
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
