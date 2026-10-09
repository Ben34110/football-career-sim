'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { seasonLabel } from '@/lib/engine/player';
import { useGameStore } from '@/lib/store';

export function CareerEnd() {
  const player = useGameStore((s) => s.player);
  const history = useGameStore((s) => s.history);
  const reset = useGameStore((s) => s.resetCareer);
  const router = useRouter();
  if (!player) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center">
        <div className="eyebrow text-gold-300">Hall of fame</div>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">A Career Complete</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {history.length} seasons · peak OVR {player.peakOvr}
        </p>
      </div>
      <PlayerCard name={player.name} nationality={player.nationality} position={player.position} attrs={player.attrs} age={player.age} clubId={player.clubId} />
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
        <SectionTitle>Honours</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {player.trophies.length === 0 && <span className="text-sm text-zinc-500">No silverware — but plenty of memories.</span>}
          {player.trophies.map((t, i) => (
            <Chip key={`${t}-${i}`} tone="gold">
              <Trophy className="h-3 w-3" /> {t}
            </Chip>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-zinc-600">Last season: {history.length ? seasonLabel(history[history.length - 1].year) : '—'}</p>
      <Button
        block
        size="lg"
        onClick={() => {
          reset();
          router.replace('/');
        }}
      >
        Start a new career
      </Button>
    </motion.div>
  );
}
