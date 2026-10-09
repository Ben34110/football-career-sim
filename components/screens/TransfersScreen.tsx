'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Check, FileSignature, Handshake, Megaphone, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { Crest } from '@/components/ui/Crest';
import { CLUBS, getClub } from '@/lib/data/clubs';
import { fmtMoneyK, fmtMoneyM, marketValue, ovrOf } from '@/lib/engine/player';
import { approachChance, COUNTER_OPTIONS, counterChance, transferWindow } from '@/lib/engine/transfers';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import type { Offer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sheet } from '@/components/ui/Sheet';

const TIER_LABEL = ['', 'Elite', 'Top flight', 'Mid-table', 'Second tier', 'Lower leagues'];

export function TransfersScreen() {
  const t = useT();
  const s = useGameStore();
  const { player, season, phase, year, offers, approached, transferListed, pendingMove } = s;
  const [confirmList, setConfirmList] = useState(false);

  const win = transferWindow(season, phase, year);
  useEffect(() => {
    s.ensureOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.key, phase]);

  const club = getClub(player?.clubId ?? null);
  const myOvr = player ? ovrOf(player) : 0;
  // 570+ clubs exist: show the ones that are realistically within reach
  const targets = useMemo(
    () =>
      CLUBS.filter((c) => c.id !== player?.clubId && c.strength >= myOvr - 10 && c.strength <= myOvr + 16)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 40),
    [player?.clubId, myOvr],
  );
  if (!player) return null;
  const ovr = ovrOf(player);
  const value = marketValue(ovr, player.age);
  const run = (r: { ok: boolean; msg: string }) => toast(r.msg, r.ok ? 'good' : 'bad');

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">{t('Transfer market')}</div>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{t('Agent Desk')}</h1>
      </div>

      <Card gold={win.open} className="flex items-center gap-3 p-3.5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', win.open ? 'bg-neon-400/15 text-neon-300' : 'bg-white/[0.06] text-zinc-500')}>
          {win.open ? <FileSignature className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">{win.open ? t('Window open') : t('Window closed')}</div>
          <div className="text-xs text-zinc-400">{win.open ? t(win.label) : t('Reopens before the season and after matchday 5.')}</div>
        </div>
        <Chip tone={win.open ? 'good' : 'neutral'}>{t(win.kind === 'closed' ? 'Closed' : win.kind === 'summer' ? 'Summer' : 'Winter')}</Chip>
      </Card>

      {/* Contract */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          {club ? <Crest short={club.short} color={club.color} size={44} /> : <div className="h-11 w-11 rounded-full bg-white/10" />}
          <div className="flex-1">
            <div className="text-sm font-bold">{club?.name ?? t('Free agent')}</div>
            <div className="text-xs text-zinc-500">{club ? t(club.league) : t('No contract')}</div>
          </div>
          <div className="text-right">
            <div className="eyebrow">{t('Market value')}</div>
            <div className="font-num text-xl font-extrabold text-gold-300">{fmtMoneyM(value)}</div>
          </div>
        </div>
        {player.contract && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label={t('Wage / wk')} value={fmtMoneyK(player.contract.wage)} />
            <Mini label={t('Years left')} value={String(Math.max(0, player.contract.yearsLeft))} />
            <Mini label={t('Savings')} value={fmtMoneyK(player.money)} />
          </div>
        )}
        {player.contract && (
          <Button block variant="ghost" size="sm" className="mt-3" onClick={() => run(s.requestRenewal())}>
            <Handshake className="h-4 w-4" /> {t('Negotiate a new deal')}
          </Button>
        )}
      </Card>

      {pendingMove && (
        <Card gold className="flex items-center gap-3 p-4">
          <Check className="h-5 w-5 text-neon-300" />
          <div className="flex-1 text-sm">
            {pendingMove.source === 'renewal' ? t('New deal agreed') : t('Pre-agreed move to')} <b>{getClub(pendingMove.clubId)?.name}</b>
            <div className="text-xs text-zinc-400">{t('Takes effect when next season starts.')}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={s.cancelPendingMove}>
            {t('Cancel')}
          </Button>
        </Card>
      )}

      {/* Offers */}
      <div>
        <SectionTitle right={<Chip tone={offers.length ? 'gold' : 'neutral'}>{offers.length}</Chip>}>{t('Offers on the table')}</SectionTitle>
        <div className="space-y-3">
          {offers.length === 0 && (
            <Card className="p-5 text-center text-sm text-zinc-500">
              {win.open ? t('No offers yet. Have your agent approach clubs below, or play well to attract attention.') : t('Offers arrive when the window opens.')}
            </Card>
          )}
          <AnimatePresence initial={false}>
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} open={win.open} immediate={win.immediate} onRun={run} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Approach */}
      <div>
        <SectionTitle>{t('Agent: approach a club')}</SectionTitle>
        <Card className="divide-y divide-white/[0.06] p-0">
          {targets.map((c) => {
            const p = approachChance(player, c);
            const done = approached.includes(c.id) || offers.some((o) => o.clubId === c.id);
            const label = p >= 0.65 ? ['Likely', 'good'] : p >= 0.35 ? ['Possible', 'gold'] : ['Long shot', 'bad'];
            return (
              <div key={c.id} className="flex items-center gap-3 px-3.5 py-3">
                <Crest short={c.short} color={c.color} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{c.name}</div>
                  <div className="text-[11px] text-zinc-500">
                    {c.flag} {t(c.league)} · {t(TIER_LABEL[c.tier])} · {c.strength}
                  </div>
                </div>
                <Chip tone={label[1] as 'good' | 'gold' | 'bad'}>{t(label[0])}</Chip>
                <Button size="sm" variant="ghost" disabled={!win.open || done} onClick={() => run(s.approach(c.id))}>
                  {done ? <Check className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </Card>
      </div>

      {club && (
        <Button block variant="danger" disabled={!win.open || transferListed} onClick={() => setConfirmList(true)}>
          <TrendingUp className="h-4 w-4" /> {transferListed ? t('On the transfer list') : t('Hand in a transfer request')}
        </Button>
      )}

      <Sheet open={confirmList} dismissible onClose={() => setConfirmList(false)}>
        <h3 className="font-display text-2xl font-bold uppercase">{t('Request a transfer?')}</h3>
        <p className="mt-1 text-sm text-zinc-400">{t('More clubs will come calling, but the manager and dressing room won’t love it (Coach Trust −6, Locker Room −3).')}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => setConfirmList(false)}>
            {t('Stay quiet')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              run(s.requestTransfer());
              setConfirmList(false);
            }}
          >
            {t('File request')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function OfferCard({ offer, open, immediate, onRun }: { offer: Offer; open: boolean; immediate: boolean; onRun: (r: { ok: boolean; msg: string }) => void }) {
  const t = useT();
  const store = useGameStore.getState;
  const player = useGameStore((s) => s.player)!;
  const [countering, setCountering] = useState(false);
  const c = getClub(offer.clubId);
  if (!c) return null;
  const current = player.contract?.wage ?? 0;
  const rise = current ? Math.round(((offer.wage - current) / current) * 100) : 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}>
      <Card gold={offer.source === 'approach'} strong className="p-4">
        <div className="flex items-center gap-3">
          <Crest short={c.short} color={c.color} size={46} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold">{c.name}</div>
            <div className="text-xs text-zinc-500">
              {c.flag} {t(c.league)} · {t(TIER_LABEL[c.tier])}
            </div>
          </div>
          <Chip tone={offer.source === 'renewal' ? 'info' : offer.source === 'approach' ? 'gold' : 'neutral'}>
            {t(offer.source === 'renewal' ? 'Renewal' : offer.source === 'approach' ? 'Via agent' : 'Incoming')}
          </Chip>
        </div>
        <p className="mt-2.5 text-[13px] text-zinc-400">{t(offer.note)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label={t('Wage / wk')} value={fmtMoneyK(offer.wage)} sub={current && rise !== 0 ? `${rise > 0 ? '+' : ''}${rise}%` : undefined} good={rise > 0} />
          <Mini label={t('Contract')} value={`${offer.years} ${t('yrs')}`} />
          <Mini label={t('Fee')} value={offer.fee > 0 ? fmtMoneyM(offer.fee) : '—'} />
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
          <Button disabled={!open} onClick={() => onRun(store().signOffer(offer.id))}>
            {immediate ? t('Accept') : t('Agree for next season')}
          </Button>
          <Button variant="ghost" disabled={!open || offer.countered} onClick={() => setCountering((v) => !v)} aria-label={t('Counter offer')}>
            {t('Counter')}
          </Button>
          <Button variant="ghost" onClick={() => store().declineOffer(offer.id)} aria-label={t('Decline offer')}>
            <Ban className="h-4 w-4" />
          </Button>
        </div>
        <AnimatePresence>
          {countering && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 grid grid-cols-2 gap-2">
                {COUNTER_OPTIONS.map((o) => (
                  <button
                    key={o.mult}
                    onClick={() => {
                      onRun(store().counter(offer.id, o.mult));
                      setCountering(false);
                    }}
                    className="rounded-xl border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-left active:scale-95"
                  >
                    <div className="text-[13px] font-bold text-gold-300">{t(o.label)}</div>
                    <div className="text-[11px] text-zinc-400">{t('{n}% they agree · risk of walking away', { n: Math.round(counterChance(player, o.mult) * 100) })}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function Mini({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-black/30 px-1 py-2">
      <div className="font-num text-lg font-extrabold leading-none">{value}</div>
      {sub && <div className={cn('mt-0.5 text-[10px] font-bold', good ? 'text-neon-400' : 'text-crimson-400')}>{sub}</div>}
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
