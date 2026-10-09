'use client';

import { RotateCcw, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AttributeBars, RepBars } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { ShareCardButton } from '@/components/ui/ShareCardButton';
import { Sheet } from '@/components/ui/Sheet';
import { getNationality } from '@/lib/data/nationalities';
import { fmtMoneyK, POSITION_LABEL } from '@/lib/engine/player';
import { LangToggle } from '@/components/ui/LangToggle';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';

export function ProfileScreen() {
  const t = useT();
  const player = useGameStore((s) => s.player);
  const reset = useGameStore((s) => s.resetCareer);
  const retire = useGameStore((s) => s.retireNow);
  const router = useRouter();
  const [sheet, setSheet] = useState<null | 'reset' | 'retire'>(null);
  if (!player) return null;
  const nat = getNationality(player.nationality);

  return (
    <div className="space-y-5">
      <PlayerCard name={player.name} nationality={player.nationality} position={player.position} attrs={player.attrs} xp={player.xp} age={player.age} clubId={player.clubId} look={player.look} />
      <ShareCardButton player={player} />

      <div className="flex flex-wrap gap-2">
        <Chip>{nat.flag} {t(nat.name)}</Chip>
        <Chip>{t(POSITION_LABEL[player.position])}</Chip>
        <Chip>{t(player.foot === 'Both' ? 'Both feet' : `${player.foot} foot`)}</Chip>
        <Chip tone="gold">{t('Peak OVR')} {player.peakOvr}</Chip>
        <Chip tone="info">{t('Morale')} {player.morale}</Chip>
        {(player.strikes ?? 0) > 0 && <Chip tone="bad">{t('Scandal strikes')} {player.strikes}/3</Chip>}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          [t('Apps'), player.totals.apps],
          [t('Goals'), player.totals.goals],
          [t('Assists'), player.totals.assists],
          [t('Moves'), player.totals.transfers],
        ].map(([l, v]) => (
          <Card key={l as string} className="py-3">
            <div className="font-num text-2xl font-extrabold">{v}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{l}</div>
          </Card>
        ))}
      </div>

      <Card className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-3xl">{nat.flag}</div>
        <div className="flex-1">
          <div className="text-sm font-bold">{t('{team} national team', { team: t(nat.name) })}</div>
          <div className="text-xs text-zinc-500">{t('International record')}</div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <div className="font-num text-2xl font-extrabold">{player.national?.caps ?? 0}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Caps')}</div>
          </div>
          <div>
            <div className="font-num text-2xl font-extrabold">{player.national?.goals ?? 0}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Goals')}</div>
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle>{t('Attributes')}</SectionTitle>
        <Card className="p-4">
          <AttributeBars attrs={player.attrs} />
        </Card>
      </div>
      <div>
        <SectionTitle>{t('Reputation')}</SectionTitle>
        <Card className="p-4">
          <RepBars rep={player.rep} />
        </Card>
      </div>

      <div>
        <SectionTitle>{t('Trophy cabinet')}</SectionTitle>
        {player.trophies.length === 0 ? (
          <Card className="p-5 text-center text-sm text-zinc-500">{t('Empty for now. Win a cup final or the league to fill it.')}</Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.trophies.map((tr, i) => (
              <Chip key={`${tr}-${i}`} tone={tr.startsWith('Ballon') ? 'good' : 'gold'}>
                <Trophy className="h-3 w-3" /> {t(tr)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <Card className="flex items-center justify-between p-4 text-sm">
        <span className="text-zinc-400">{t('Career earnings')}</span>
        <span className="font-num text-lg font-extrabold text-gold-300">{fmtMoneyK(player.money)}</span>
      </Card>

      <Card className="flex items-center justify-between p-4">
        <span className="text-sm text-zinc-400">{t('Language')}</span>
        <LangToggle />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={() => setSheet('retire')}>
          {t('Retire')}
        </Button>
        <Button variant="danger" onClick={() => setSheet('reset')}>
          <RotateCcw className="h-4 w-4" /> {t('Reset save')}
        </Button>
      </div>

      <Sheet open={sheet !== null} dismissible onClose={() => setSheet(null)}>
        <h3 className="font-display text-2xl font-bold uppercase">{sheet === 'reset' ? t('Delete this career?') : t('Hang up your boots?')}</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {sheet === 'reset' ? t('All progress will be erased. This can’t be undone.') : t('Your career ends here and you’ll see your final recap.')}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => setSheet(null)}>
            {t('Cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (sheet === 'reset') {
                reset();
                router.replace('/');
              } else {
                retire();
                router.push('/home');
              }
              setSheet(null);
            }}
          >
            {t('Confirm')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
