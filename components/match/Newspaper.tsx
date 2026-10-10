"use client";

import { motion } from "framer-motion";
import { Loader2, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { HeadAvatar } from "@/components/ui/HeadAvatar";
import { Crowd } from "./Crowd";
import type { Look } from "@/lib/data/look";
import { buildFrontPage, type PaperCtx } from "@/lib/data/newspaper";
import { fmtGameDate } from "@/lib/dates";
import { useLang, useT } from "@/lib/i18n";
import { sharePaper } from "@/lib/shareNewspaper";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export interface RoundupLine {
  home: string;
  away: string;
  h: number;
  a: number;
}

/** The morning-after front page: headline, photo, recap, your rating and the other results. */
export function Newspaper({
  ctx,
  look,
  kit,
  date,
}: {
  ctx: PaperCtx;
  look?: Look;
  kit?: string;
  date: Date;
  roundup?: RoundupLine[];
}) {
  const t = useT();
  const { lang } = useLang();
  // the page is written once per match
  const page = useMemo(() => buildFrontPage(ctx), []); // eslint-disable-line react-hooks/exhaustive-deps
  const vars: Record<string, string | number> = {
    ...page.vars,
    resultVerb: t(String(page.vars.resultVerb)),
    comp: t(String(page.vars.comp)),
    psWord: t(String(page.vars.psWord)),
  };
  const joy = page.mood === "joy";
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    const r = await sharePaper(
      {
        outlet: page.outlet,
        dateLine: fmtGameDate(date, lang),
        edition: ctx.edition,
        headline: t(page.headline, vars),
        caption: t(page.caption, vars),
        paragraph: t(page.paragraphs[0], vars),
        playerLine: `${String(vars.name)} — ${t(page.verdict)}`,
        rating: ctx.rating.toFixed(1),
        joy,
        look,
        kit,
        footer: t("Built in Pitch Legacy"),
      },
      t("{name} made the front page! Can you beat my career?", {
        name: String(vars.name),
      }),
    );
    setBusy(false);
    if (r === "downloaded") toast(t("Front page saved as an image."), "good");
    else if (r === "failed") toast(t("Could not create the image."), "bad");
  };

  return (
    <div className="space-y-2.5">
      <motion.article
        initial={{ y: 60, rotate: -3, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, rotate: -0.5, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 130, damping: 16 }}
        className="overflow-hidden rounded-md bg-[#f2ead7] font-serif text-zinc-900 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)]"
      >
        {/* masthead */}
        <header className="border-b-[3px] border-double border-zinc-800 px-3 pb-1.5 pt-2 text-center">
          <div className="font-display text-[24px] font-extrabold uppercase leading-none tracking-wide">
            {page.outlet}
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-zinc-800/60 pt-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            <span>No. {ctx.edition}</span>
            <span className="capitalize">{fmtGameDate(date, lang)}</span>
          </div>
        </header>

        <div className="space-y-2 px-3 pb-3 pt-2">
          {/* headline */}
          <h2 className="font-display text-[27px] font-extrabold uppercase leading-[0.95] tracking-tight">
            {t(page.headline, vars)}
          </h2>

          {/* photo: a floodlit stadium shot, no emoji */}
          <figure>
            <div
              className="relative flex h-[178px] items-end justify-center overflow-hidden rounded-sm border border-zinc-800/50"
              style={{
                background: joy
                  ? "radial-gradient(ellipse at 50% 0%, #fde68a 0%, #d97706 42%, #3b1a05 100%)"
                  : "radial-gradient(ellipse at 50% 0%, #cbd5e1 0%, #64748b 42%, #0b1220 100%)",
              }}
            >
              {/* supporters in the stands, out of focus */}
              <Crowd kit={kit} joy={joy} />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 [filter:grayscale(0.2)_contrast(1.08)_sepia(0.18)_drop-shadow(0_8px_10px_rgba(0,0,0,0.5))]">
                <HeadAvatar look={look} size={168} kit={kit} />
              </div>
              {/* soft vignette */}
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_36px_rgba(0,0,0,0.55)]" />
            </div>
            <figcaption className="mt-0.5 text-[9px] italic text-zinc-600">
              {t(page.caption, vars)}
            </figcaption>
          </figure>

          {/* one short paragraph */}
          <p className="text-[12px] leading-snug text-zinc-800">
            {t(page.paragraphs[0], vars)}
          </p>

          {/* rating strip */}
          <div className="flex items-center justify-between border-y-2 border-zinc-800 py-1">
            <div className="text-[12px] font-semibold">
              {String(vars.name)} — {t(page.verdict)}
            </div>
            <div className="font-display text-2xl font-extrabold leading-none">
              {ctx.rating.toFixed(1)}
            </div>
          </div>
        </div>
      </motion.article>
      <button
        onClick={share}
        disabled={busy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-[13px] font-bold text-zinc-200 active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}{" "}
        {t("Share the front page")}
      </button>
    </div>
  );
}
