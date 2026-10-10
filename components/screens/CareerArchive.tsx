'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Clapperboard, Trophy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { HeadAvatar } from '@/components/ui/HeadAvatar';
import { Honours } from '@/components/ui/Honours';
import { ShareCardButton } from '@/components/ui/ShareCardButton';
import { useArchiveStore, type ArchivedCareer } from '@/lib/archive';
import { getNationality } from '@/lib/data/nationalities';
import { useLang, useT } from '@/lib/i18n';
import { fmtShortDate } from '@/lib/dates';
import { CareerFilm } from './CareerFilm';

const span = (c: ArchivedCareer) => (c.history.length ? `${c.history[0].year}–${c.history[c.history.length - 1].year + 1}` : '');

/** Every career you have played, finished or dropped: open one to see its honours, replay its film or share its card. */
export function CareerArchive({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const careers = useArchiveStore((s) => s.careers);
  const remove = useArchiveStore((s) => s.remove);
  const [selected, setSelected] = useState<string | null>(null);
  const [film, setFilm] = useState(false);
  const [sure, setSure] = useState(false);
  const current = careers.find((c) => c.id === selected) ?? null;

  const close = () => {
    setSelected(null);
    setSure(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] mx-auto max-w-[430px] overflow-y-auto bg-zinc-950 px-4 pb-10 pt-safe" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.3 }}>
          <div className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-zinc-950/90 px-4 py-3 backdrop-blur">
            <button onClick={current ? () => { setSelected(null); setSure(false); } : close} aria-label={t('Back')} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 active:scale-90">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="eyebrow text-gold-300">{t('Hall of fame')}</div>
              <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{current ? current.player.name : t('My careers')}</h2>
            </div>
          </div>

          {!current && careers.length === 0 && (
            <Card className="mt-6 p-8 text-center">
              <Trophy className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-400">{t('Your finished careers will be kept here, with their honours and their film.')}</p>
            </Card>
          )}

          {!current && (
            <div className="mt-3 space-y-3">
              {careers.map((c) => {
                const nat = getNationality(c.player.nationality);
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)} className="gloss-edge glass flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.98]">
                    <HeadAvatar look={c.player.look} size={58} framed />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-xl font-extrabold uppercase leading-none">{c.player.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-zinc-400">
                        <Flag emoji={nat.flag} size={11} /> {c.player.position} · {span(c)} · {t('{n} seasons', { n: c.history.length })}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-zinc-500">
                        {c.player.totals.goals} {t('Goals')} · {c.player.totals.assists} {t('Assists')} · {c.player.trophies.length} {t('Honours').toLowerCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-num text-2xl font-extrabold text-gold-300">{c.player.peakOvr}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t('Peak OVR')}</div>
                      {!c.retired && <Chip tone="neutral">{t('Unfinished')}</Chip>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {current && (
            <div className="mt-3 space-y-4">
              <div className="flex flex-col items-center text-center">
                <HeadAvatar look={current.player.look} size={120} framed expression="cheer" />
                <div className="mt-2 flex items-center gap-1.5 text-sm text-zinc-300">
                  <Flag emoji={getNationality(current.player.nationality).flag} size={13} /> {t(getNationality(current.player.nationality).name)} · {current.player.position}
                </div>
                <div className="text-xs text-zinc-500">
                  {span(current)} · {t('{n} seasons', { n: current.history.length })} · {fmtShortDate(new Date(current.endedAt), lang)}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  [t('Peak OVR'), current.player.peakOvr],
                  [t('Apps'), current.player.totals.apps],
                  [t('Goals'), current.player.totals.goals],
                  [t('Assists'), current.player.totals.assists],
                ].map(([l, v]) => (
                  <Card key={l as string} className="py-3">
                    <div className="font-num text-2xl font-extrabold">{v}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{l}</div>
                  </Card>
                ))}
              </div>
              <div>
                <div className="eyebrow mb-2">{t('Honours')} · {current.player.trophies.length}</div>
                {current.player.trophies.length === 0 ? <p className="text-sm text-zinc-500">{t('No silverware — but plenty of memories.')}</p> : <Honours trophies={current.player.trophies} history={current.history} clubId={current.player.clubId} />}
              </div>
              <div className="space-y-2 pt-2">
                <Button variant="gold" block onClick={() => setFilm(true)}>
                  <Clapperboard className="h-4 w-4" /> {t('Watch my career film')}
                </Button>
                <ShareCardButton player={current.player} career={current.history} />
                {sure ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="ghost" onClick={() => setSure(false)}>
                      {t('Keep playing')}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        remove(current.id);
                        setSelected(null);
                        setSure(false);
                      }}
                    >
                      {t('Delete')}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" block onClick={() => setSure(true)}>
                    <Trash2 className="h-4 w-4" /> {t('Delete this career')}
                  </Button>
                )}
              </div>
            </div>
          )}

          <AnimatePresence>{film && current && <CareerFilm player={current.player} history={current.history} onClose={() => setFilm(false)} />}</AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
