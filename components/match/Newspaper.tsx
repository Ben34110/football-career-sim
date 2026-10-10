'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { HeadAvatar } from '@/components/ui/HeadAvatar';
import type { Look } from '@/lib/data/look';
import { buildFrontPage, type PaperCtx } from '@/lib/data/newspaper';
import { fmtGameDate } from '@/lib/dates';
import { useLang, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface RoundupLine {
  home: string;
  away: string;
  h: number;
  a: number;
}

/** The morning-after front page: headline, photo, recap, your rating and the other results. */
export function Newspaper({ ctx, look, date, roundup }: { ctx: PaperCtx; look?: Look; date: Date; roundup: RoundupLine[] }) {
  const t = useT();
  const { lang } = useLang();
  // the page is written once per match
  const page = useMemo(() => buildFrontPage(ctx), []); // eslint-disable-line react-hooks/exhaustive-deps
  const vars: Record<string, string | number> = { ...page.vars, resultVerb: t(String(page.vars.resultVerb)), comp: t(String(page.vars.comp)), psWord: t(String(page.vars.psWord)) };
  const joy = page.mood === 'joy';

  return (
    <motion.article
      initial={{ y: 60, rotate: -3, opacity: 0, scale: 0.94 }}
      animate={{ y: 0, rotate: -0.5, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 130, damping: 16 }}
      className="overflow-hidden rounded-md bg-[#f2ead7] font-serif text-zinc-900 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)]"
    >
      {/* masthead */}
      <header className="border-b-[3px] border-double border-zinc-800 px-4 pb-2 pt-3 text-center">
        <div className="font-display text-[34px] font-extrabold uppercase leading-none tracking-wide">{page.outlet}</div>
        <div className="mt-0.5 text-[11px] italic text-zinc-600">{t(page.tagline)}</div>
        <div className="mt-2 flex items-center justify-between border-t border-zinc-800/60 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>No. {ctx.edition}</span>
          <span className="capitalize">{fmtGameDate(date, lang)}</span>
          <span>€1.50</span>
        </div>
      </header>

      <div className="space-y-3 px-4 pb-4 pt-3">
        {/* headline */}
        <h2 className="font-display text-[38px] font-extrabold uppercase leading-[0.92] tracking-tight">{t(page.headline, vars)}</h2>
        <p className="text-[14px] italic leading-snug text-zinc-700">{t(page.sub, vars)}</p>

        {/* photo */}
        <figure>
          <div className={cn('relative flex h-[150px] items-end justify-center overflow-hidden rounded-sm border border-zinc-800/40', joy ? 'bg-gradient-to-b from-amber-200 to-amber-400' : 'bg-gradient-to-b from-zinc-300 to-zinc-500')}>
            <span className="absolute inset-0 flex items-center justify-around text-5xl opacity-25" aria-hidden>
              {joy ? '🎉 🏟️ 🎊' : '🌧️ 🏟️ 🌫️'}
            </span>
            <div className="relative -mb-4 [filter:grayscale(0.35)_contrast(1.1)_sepia(0.25)]">
              <HeadAvatar look={look} size={130} framed={false} />
            </div>
          </div>
          <figcaption className="mt-1 text-[10px] italic text-zinc-600">{t(page.caption, vars)}</figcaption>
        </figure>

        {/* body */}
        <div className="space-y-2 text-[13px] leading-snug text-zinc-800 [column-gap:1rem]">
          {page.paragraphs.map((p, i) => (
            <p key={i} className={cn(i === 0 && 'first-letter:float-left first-letter:mr-1 first-letter:font-display first-letter:text-4xl first-letter:font-extrabold first-letter:leading-[0.85]')}>
              {t(p, vars)}
            </p>
          ))}
        </div>

        {/* rating box */}
        <div className="flex items-center justify-between border-y-2 border-zinc-800 py-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t('Player rating')}</div>
            <div className="text-[13px] font-semibold">
              {String(vars.name)} — {t(page.verdict)}
            </div>
          </div>
          <div className="font-display text-4xl font-extrabold leading-none">{ctx.rating.toFixed(1)}</div>
        </div>

        {/* other results */}
        {roundup.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t('Around the grounds')}</div>
            <div className="grid grid-cols-1 gap-x-4 text-[11.5px] leading-tight text-zinc-700 min-[360px]:grid-cols-2">
              {roundup.slice(0, 6).map((r, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-dotted border-zinc-500/50 py-0.5">
                  <span className="truncate">
                    {r.home} <b>{r.h}–{r.a}</b> {r.away}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
}
