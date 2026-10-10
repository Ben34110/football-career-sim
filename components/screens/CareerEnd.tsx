'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Clapperboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Honours } from '@/components/ui/Honours';
import { CareerFilm } from './CareerFilm';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { ShareCardButton } from '@/components/ui/ShareCardButton';
import { seasonLabel } from '@/lib/engine/player';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';

export function CareerEnd() {
  const t = useT();
  const player = useGameStore((s) => s.player);
  const history = useGameStore((s) => s.history);
  const reset = useGameStore((s) => s.resetCareer);
  const router = useRouter();
  // the film of the career plays the first time you retire; you can watch it again from here
  const [film, setFilm] = useState(false);
  useEffect(() => {
    if (!player) return;
    const key = `fcs-film-${player.name}-${history.length}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        setFilm(true);
      }
    } catch {
      setFilm(true);
    }
  }, [player, history.length]);
  if (!player) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <AnimatePresence>{film && <CareerFilm player={player} history={history} onClose={() => setFilm(false)} />}</AnimatePresence>
      <div className="text-center">
        <div className="eyebrow text-gold-300">{t('Hall of fame')}</div>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none">{t('A Career Complete')}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {t('{n} seasons · peak OVR {m}', { n: history.length, m: player.peakOvr })}
        </p>
      </div>
      <PlayerCard name={player.name} nationality={player.nationality} position={player.position} attrs={player.attrs} xp={player.xp} age={player.age} clubId={player.clubId} look={player.look} />
      <Button variant="gold" block onClick={() => setFilm(true)}>
        <Clapperboard className="h-4 w-4" /> {t('Watch my career film')}
      </Button>
      <ShareCardButton player={player} career={history} />
      <ShareCardButton player={player} />
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
      <div>
        <SectionTitle>{t('Honours')}</SectionTitle>
        {player.trophies.length === 0 ? <span className="text-sm text-zinc-500">{t('No silverware — but plenty of memories.')}</span> : <Honours trophies={player.trophies} history={history} clubId={player.clubId} />}
      </div>
      <p className="text-center text-xs text-zinc-600">{t('Last season')}: {history.length ? seasonLabel(history[history.length - 1].year) : '—'}</p>
      <Button
        block
        size="lg"
        onClick={() => {
          reset();
          router.replace('/');
        }}
      >
        {t('Start a new career')}
      </Button>
    </motion.div>
  );
}
