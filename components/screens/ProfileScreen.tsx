'use client';

import { RotateCcw, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AttributeBars, RepBars } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { Sheet } from '@/components/ui/Sheet';
import { getNationality } from '@/lib/data/nationalities';
import { fmtMoneyK, POSITION_LABEL } from '@/lib/engine/player';
import { useGameStore } from '@/lib/store';

export function ProfileScreen() {
  const player = useGameStore((s) => s.player);
  const reset = useGameStore((s) => s.resetCareer);
  const retire = useGameStore((s) => s.retireNow);
  const router = useRouter();
  const [sheet, setSheet] = useState<null | 'reset' | 'retire'>(null);
  if (!player) return null;
  const nat = getNationality(player.nationality);

  return (
    <div className="space-y-5">
      <PlayerCard name={player.name} nationality={player.nationality} position={player.position} attrs={player.attrs} age={player.age} clubId={player.clubId} />

      <div className="flex flex-wrap gap-2">
        <Chip>{nat.flag} {nat.name}</Chip>
        <Chip>{POSITION_LABEL[player.position]}</Chip>
        <Chip>{player.foot} foot</Chip>
        <Chip tone="gold">Peak OVR {player.peakOvr}</Chip>
        <Chip tone="info">Morale {player.morale}</Chip>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ['Apps', player.totals.apps],
          ['Goals', player.totals.goals],
          ['Assists', player.totals.assists],
          ['Moves', player.totals.transfers],
        ].map(([l, v]) => (
          <Card key={l as string} className="py-3">
            <div className="font-num text-2xl font-extrabold">{v}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{l}</div>
          </Card>
        ))}
      </div>

      <div>
        <SectionTitle>Attributes</SectionTitle>
        <Card className="p-4">
          <AttributeBars attrs={player.attrs} />
        </Card>
      </div>
      <div>
        <SectionTitle>Reputation</SectionTitle>
        <Card className="p-4">
          <RepBars rep={player.rep} />
        </Card>
      </div>

      <div>
        <SectionTitle>Trophy cabinet</SectionTitle>
        {player.trophies.length === 0 ? (
          <Card className="p-5 text-center text-sm text-zinc-500">Empty for now. Win a cup final or the league to fill it.</Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.trophies.map((t, i) => (
              <Chip key={`${t}-${i}`} tone="gold">
                <Trophy className="h-3 w-3" /> {t}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <Card className="flex items-center justify-between p-4 text-sm">
        <span className="text-zinc-400">Career earnings</span>
        <span className="font-num text-lg font-extrabold text-gold-300">{fmtMoneyK(player.money)}</span>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={() => setSheet('retire')}>
          Retire
        </Button>
        <Button variant="danger" onClick={() => setSheet('reset')}>
          <RotateCcw className="h-4 w-4" /> Reset save
        </Button>
      </div>

      <Sheet open={sheet !== null} dismissible onClose={() => setSheet(null)}>
        <h3 className="font-display text-2xl font-bold uppercase">{sheet === 'reset' ? 'Delete this career?' : 'Hang up your boots?'}</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {sheet === 'reset' ? 'All progress will be erased. This can’t be undone.' : 'Your career ends here and you’ll see your final recap.'}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => setSheet(null)}>
            Cancel
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
            Confirm
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
