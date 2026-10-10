'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Crest } from '@/components/ui/Crest';
import { Flag } from '@/components/ui/Flag';
import { HeadAvatar, shade } from '@/components/ui/HeadAvatar';
import { Honours } from '@/components/ui/Honours';
import { ShareCardButton } from '@/components/ui/ShareCardButton';
import { getClub } from '@/lib/data/clubs';
import { getNationality, nationalityByName } from '@/lib/data/nationalities';
import { seasonLabel } from '@/lib/engine/player';
import { useLang, useT } from '@/lib/i18n';
import type { Player, SeasonRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

const INTRO_MS = 3400;
const SEASON_MS = 3800;

/** A number that counts up when its slide appears. */
function CountUp({ to, delay = 0.3, duration = 1.1, decimals = 0 }: { to: number; delay?: number; duration?: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const loop = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / (duration * 1000)));
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return <>{decimals ? v.toFixed(decimals) : Math.round(v)}</>;
}

const ordinal = (n: number, lang: string) => {
  if (lang === 'fr') return n === 1 ? '1er' : `${n}e`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

type Slide = { kind: 'intro' } | { kind: 'season'; rec: SeasonRecord; prev?: SeasonRecord; i: number } | { kind: 'finale' };

/**
 * The film of a career, season by season: the first day, every year at its club with its numbers and its trophies,
 * then the farewell. Tap to move on, or let it play.
 */
export function CareerFilm({ player, history, onClose }: { player: Player; history: SeasonRecord[]; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const slides = useMemo<Slide[]>(() => [{ kind: 'intro' }, ...history.map((rec, i) => ({ kind: 'season' as const, rec, prev: history[i - 1], i })), { kind: 'finale' }], [history]);
  const [idx, setIdx] = useState(0);
  const slide = slides[idx];
  const last = idx === slides.length - 1;

  // the film plays by itself, except on the farewell
  useEffect(() => {
    if (last) return;
    const ms = slide.kind === 'intro' ? INTRO_MS : slide.kind === 'season' && slide.rec.trophies.length ? SEASON_MS + 800 : SEASON_MS;
    const id = setTimeout(() => setIdx((i) => Math.min(slides.length - 1, i + 1)), ms);
    return () => clearTimeout(id);
  }, [idx, last, slide, slides.length]);

  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(slides.length - 1, i + d)));
  const nat = getNationality(player.nationality);
  const lastRec = history[history.length - 1];
  const bgColor = slide.kind === 'season' ? getClub(slide.rec.clubId)?.color ?? '#10b981' : '#f2c14e';

  return (
    <motion.div className="fixed inset-0 z-[90] mx-auto max-w-[430px] overflow-hidden bg-zinc-950 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <motion.div className="absolute inset-0" animate={{ background: `radial-gradient(120% 70% at 50% 0%, ${shade(bgColor, -0.35)} 0%, #09090b 68%)` }} transition={{ duration: 0.9 }} />

      {/* progress, like stories */}
      <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
        {slides.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
            {i === idx && !last ? (
              <motion.div key={`p${idx}`} className="h-full bg-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: (slide.kind === 'intro' ? INTRO_MS : slide.kind === 'season' && slide.rec.trophies.length ? SEASON_MS + 800 : SEASON_MS) / 1000, ease: 'linear' }} />
            ) : (
              <div className="h-full bg-white" style={{ width: i <= idx ? '100%' : '0%' }} />
            )}
          </div>
        ))}
      </div>
      <button onClick={onClose} className="absolute right-3 top-7 z-30 rounded-full bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80 backdrop-blur">
        {t('Skip')}
      </button>

      {/* tap zones */}
      {!last && (
        <div className="absolute inset-0 z-10 flex">
          <button aria-label={t('Previous')} className="w-1/3" onClick={() => go(-1)} />
          <button aria-label={t('Next')} className="w-2/3" onClick={() => go(1)} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={idx} className="absolute inset-0 flex flex-col items-center px-6 pb-8 pt-16" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
          {slide.kind === 'intro' && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="eyebrow text-gold-300">{t('Your career')}</div>
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 160, damping: 15 }} className="mt-5">
                <HeadAvatar look={player.look} size={170} framed expression="neutral" />
              </motion.div>
              <h1 className="mt-5 font-display text-5xl font-extrabold uppercase leading-none">{player.name}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Flag emoji={nat.flag} size={14} /> {t(nat.name)} · {player.position}
              </div>
              <p className="mt-6 max-w-[17rem] text-lg font-semibold text-zinc-200">
                {history.length === 0 ? t('A career that ended before it began.') : t('{n} seasons, from {a} to {b}.', { n: history.length, a: history[0].year, b: lastRec.year + 1 })}
              </p>
            </div>
          )}

          {slide.kind === 'season' && <SeasonSlide rec={slide.rec} prev={slide.prev} total={history.length} history={history} lang={lang} />}

          {slide.kind === 'finale' && (
            <div className="flex w-full flex-1 flex-col items-center overflow-y-auto text-center">
              <div className="eyebrow text-gold-300">{t('Hall of fame')}</div>
              <HeadAvatar look={player.look} size={110} framed expression="cheer" />
              <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none">{player.name}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {history[0]?.year}–{lastRec ? lastRec.year + 1 : ''} · {t('{n} seasons', { n: history.length })}
              </p>
              <div className="mt-4 grid w-full grid-cols-4 gap-2">
                {[
                  [t('Peak OVR'), player.peakOvr],
                  [t('Apps'), player.totals.apps],
                  [t('Goals'), player.totals.goals],
                  [t('Assists'), player.totals.assists],
                ].map(([l, v], i) => (
                  <div key={l as string} className={cn('rounded-2xl border bg-black/30 py-2.5', i === 0 ? 'border-gold-300/50' : 'border-white/10')}>
                    <div className={cn('font-num text-2xl font-extrabold', i === 0 && 'text-gold-200')}>
                      <CountUp to={v as number} delay={0.2 + i * 0.12} />
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 w-full text-left">
                <div className="eyebrow mb-2 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-gold-300" /> {t('Honours')} · {player.trophies.length}
                </div>
                {player.trophies.length === 0 ? <p className="text-sm text-zinc-500">{t('No silverware — but plenty of memories.')}</p> : <Honours trophies={player.trophies} history={history} clubId={player.clubId} />}
              </div>
              <div className="mt-auto w-full space-y-2 pt-6">
                <ShareCardButton player={player} career={history} />
                <Button block size="lg" variant="gold" onClick={onClose}>
                  {t('Hall of fame')} <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function SeasonSlide({ rec, prev, total, history, lang }: { rec: SeasonRecord; prev?: SeasonRecord; total: number; history: SeasonRecord[]; lang: string }) {
  const t = useT();
  const club = getClub(rec.clubId);
  const moved = !!prev && prev.clubId !== rec.clubId;
  const champion = rec.leaguePos === 1;
  const ballon = rec.trophies.some((x) => x.startsWith('Ballon'));
  const tagline = ballon ? 'Ballon d’Or season' : champion ? 'League champions' : rec.trophies.length ? 'Silverware' : moved ? 'A new chapter' : rec.goals >= 20 ? 'On fire' : rec.avgRating >= 7.5 ? 'A superb year' : 'Steady progress';
  const delta = prev ? rec.ovr - prev.ovr : null;
  return (
    <div className="flex w-full flex-1 flex-col items-center text-center">
      <div className="eyebrow text-white/60">{t('Season {i} of {n}', { i: history.indexOf(rec) + 1, n: total })}</div>
      <h2 className="font-display text-6xl font-extrabold uppercase leading-none tracking-tight">{seasonLabel(rec.year)}</h2>
      <div className="mt-1 text-sm font-semibold text-white/60">{t('Age {n}', { n: rec.age })}</div>

      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }} className="mt-5 flex flex-col items-center">
        {club ? <Crest short={club.short} color={club.color} size={92} /> : null}
        <div className="mt-2 font-display text-2xl font-extrabold uppercase leading-none">{club?.name ?? t('Free agent')}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/60">
          {club && <Flag emoji={getNationalityFlag(club.country)} size={11} />} {club ? t(club.league) : ''}
        </div>
        {moved && <div className="mt-2 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">{t('New club')}</div>}
      </motion.div>

      <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
        {[
          [t('Apps'), rec.apps, 0],
          [t('Goals'), rec.goals, 0],
          [t('Assists'), rec.assists, 0],
        ].map(([l, v], i) => (
          <div key={l as string} className="rounded-2xl border border-white/10 bg-black/30 py-3">
            <div className="font-num text-4xl font-extrabold">
              <CountUp to={v as number} delay={0.35 + i * 0.15} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/10 bg-black/30 py-2.5">
          <div className={cn('font-num text-2xl font-extrabold', champion && 'text-gold-300')}>{rec.leaguePos > 0 ? ordinal(rec.leaguePos, lang) : '—'}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t('League finish')}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 py-2.5">
          <div className="font-num text-2xl font-extrabold">
            <CountUp to={rec.avgRating} decimals={1} delay={0.5} />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t('Average rating')}</div>
        </div>
      </div>

      <div className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5">
        <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-white/50">
          <span>OVR</span>
          <span className="font-num text-base text-white">
            {rec.ovr}
            {delta !== null && delta !== 0 && <span className={cn('ml-1.5 text-xs', delta > 0 ? 'text-neon-300' : 'text-crimson-400')}>{delta > 0 ? `+${delta}` : delta}</span>}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-neon-400 to-gold-300" initial={{ width: `${Math.max(0, (prev?.ovr ?? rec.ovr) - 30)}%` }} animate={{ width: `${Math.max(0, rec.ovr - 30)}%` }} transition={{ delay: 0.5, duration: 1.1, ease: 'easeOut' }} />
        </div>
      </div>

      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-5">
        {rec.trophies.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="flex justify-center">
            <Honours trophies={rec.trophies} history={[rec]} clubId={rec.clubId} />
          </motion.div>
        )}
        <div className={cn('font-display text-xl font-extrabold uppercase tracking-wide', ballon || champion ? 'text-gold-300' : 'text-white/70')}>{t(tagline)}</div>
      </div>
    </div>
  );
}

const getNationalityFlag = (country: string) => nationalityByName(country)?.flag ?? '';
