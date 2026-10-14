'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoalTarget } from '@/components/match/GoalTarget';
import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Card';
import { useArchiveStore } from '@/lib/archive';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useGameStore } from '@/lib/store';
import { tutorialSeen, useTutorial } from '@/lib/tutorial';
import { cn } from '@/lib/utils';

/** The steps: explanations with something to try, then a spotlight tour of the tab bar. */
const STEPS = ['welcome', 'live', 'decision', 'minigame', 'tactics', 'home', 'calendar', 'shop', 'profile', 'ready'] as const;
const TOUR: Partial<Record<(typeof STEPS)[number], { href: string; title: string; text: string }>> = {
  home: { href: '/home', title: 'Home|nav', text: 'Your hub: your player card, the next match, your role in the squad and the season so far.' },
  calendar: { href: '/calendar', title: 'Season', text: 'Every fixture of the season, the table, and your national team call-ups.' },
  shop: { href: '/shop', title: 'Shop', text: 'Lives come back every 3 minutes (5 at most). Here you can get more: watch an ad, buy an unlimited-lives pass, boosts and upgrades.' },
  profile: { href: '/profile', title: 'Profile', text: 'Your attributes, reputation, trophies, and a card to share. Settings are here too.' },
};

/** Where a tab of the bottom bar is, so the spotlight can sit on it. */
function useRect(selector: string | null, deps: unknown[]) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);
  return rect;
}

/** A tiny scoreboard, to show what the live match looks like. */
function MockScoreboard() {
  const t = useT();
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">US Gorée</span>
        <div className="text-center">
          <div className="font-num text-3xl font-extrabold">1 – 0</div>
          <div className="text-[11px] font-bold text-neon-300">34&apos;</div>
        </div>
        <span className="text-[13px] font-bold">AS Saint-Louis</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="ml-[50%] h-full w-[22%] rounded-r-full bg-gradient-to-r from-neon-600 to-neon-300" />
      </div>
      <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{t('Momentum')}</div>
    </div>
  );
}

const OPTIONS = [
  { id: 'a', label: 'Shoot low', hint: 'Power through the traffic', risk: 'Balanced', attr: 'Finishing', v: 62, tone: 'gold' as const },
  { id: 'b', label: 'Lay it off', hint: 'Keep the ball, change the tempo', risk: 'Safe', attr: 'Vision', v: 48, tone: 'good' as const },
  { id: 'c', label: 'Curl it in', hint: 'Bend it over the wall', risk: 'Bold', attr: 'Finishing', v: 62, tone: 'bad' as const },
];

export function Tutorial() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { open, step, start, next, back, finish } = useTutorial();
  const player = useGameStore((s) => s.player);
  const archived = useArchiveStore((s) => s.careers.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [kicks, setKicks] = useState(0);
  const [mentality, setMentality] = useState<'attack' | 'balanced' | 'defend'>('balanced');

  // the first career, before its first match: the tour opens by itself, once
  useEffect(() => {
    if (open || !player || tutorialSeen()) return;
    if (player.totals.apps === 0 && archived === 0) start();
  }, [open, player, archived, start]);

  const key = STEPS[Math.min(step, STEPS.length - 1)];
  const tour = TOUR[key];

  // the tour moves the pages under the spotlight
  useEffect(() => {
    if (!open || !tour) return;
    if (pathname !== tour.href) router.replace(tour.href, { scroll: false });
  }, [open, tour, pathname, router]);

  const rect = useRect(open && tour ? `nav a[href="${tour.href}"]` : null, [pathname]);

  if (!open || typeof document === 'undefined') return null;
  const name = player?.name.split(' ')[0] ?? '';
  const n = STEPS.indexOf(key) + 1;
  const last = key === 'ready';
  const goNext = () => {
    haptic(8);
    if (last) {
      finish('done');
      router.replace('/home', { scroll: false });
    } else next();
  };
  const skip = () => {
    finish('skipped');
    router.replace('/home', { scroll: false });
  };

  const body = (() => {
    switch (key) {
      case 'welcome':
        return (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-400/15 text-neon-300">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-none">{t('Welcome, {name}!', { name })}</h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">{t('A one-minute tour: how a match works, then a quick look around the game. You can skip it at any time.')}</p>
          </div>
        );
      case 'live':
        return (
          <>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{t('Matches play out live')}</h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">{t('The match runs minute by minute. Follow the score and the momentum bar, and use the buttons: pause, fast-forward and the live table.')}</p>
            <div className="mt-3">
              <MockScoreboard />
            </div>
          </>
        );
      case 'decision':
        return (
          <>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{t('Decision moments')}</h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">{t('At key moments the match stops and you choose. The bar is your skill for that action, the label tells how risky it is. Try one.')}</p>
            <div className="mt-3 space-y-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    haptic(12);
                    setPicked(o.id);
                  }}
                  className={cn('w-full rounded-2xl border p-3 text-left transition-colors', picked === o.id ? 'border-neon-400/60 bg-neon-400/10' : 'border-white/10 bg-white/[0.05]')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold">{t(o.label)}</div>
                      <div className="text-[11px] text-zinc-400">{t(o.hint)}</div>
                    </div>
                    <Chip tone={o.tone}>{t(o.risk)}</Chip>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                    {t(o.attr)} <span className="font-num text-sm text-zinc-100">{o.v}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-neon-400" style={{ width: `${o.v}%` }} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {picked && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-gold-400/30 bg-gold-400/10 p-3">
                <b className="text-gold-300">{t('Good choice!')}</b>
                <p className="mt-0.5 text-[12px] leading-snug text-zinc-300">{t('Safe options come off more often, bold ones pay more when they do. Your skill, your form and the momentum all count.')}</p>
              </motion.div>
            )}
          </>
        );
      case 'minigame':
        return (
          <>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{t('Mini-games')}</h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">{t('Some decisions are played for real: a penalty, a free kick, a sprint… Aim for a zone of the goal: the corners are harder to save but easier to miss.')}</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
              <GoalTarget key={kicks} kind="penalty" finishing={60} composure={56} keeperLevel={50} pressure={0.15} title={t('Practice kick')} subtitle={t('No stakes here: it is just practice.')} onDone={() => setKicks((k) => k + 1)} />
            </div>
          </>
        );
      case 'tactics':
        return (
          <>
            <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{t('Tactics and boosts')}</h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">{t('Before kick-off, read the scouting report and pick a boost if you want one. In the match, set the team mentality.')}</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/25 p-1.5">
              {(
                [
                  ['attack', 'Attack'],
                  ['balanced', 'Normal'],
                  ['defend', 'Defend'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} onClick={() => setMentality(id)} className={cn('h-10 rounded-xl text-[13px] font-bold', mentality === id ? 'bg-white/15 text-zinc-50' : 'text-zinc-400')}>
                  {t(label)}
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-2xl bg-white/[0.05] p-3 text-[13px] leading-snug text-zinc-300">
              {mentality === 'attack' ? t('All-out attack: more chances for you, and more for them too.') : mentality === 'balanced' ? t('Balanced: nothing changes.') : t('Defend: they get fewer chances, and so do you.')}
            </p>
          </>
        );
      case 'ready':
        return (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-none">{t('You are ready!')}</h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">{t('Play your first match from the Home page. Good luck, {name}.', { name })}</p>
          </div>
        );
      default:
        return null;
    }
  })();

  const dots = (
    <div className="flex items-center justify-center gap-1.5" aria-label={t('Step {n} of {m}', { n, m: STEPS.length })}>
      {STEPS.map((s, i) => (
        <span key={s} className={cn('h-1.5 rounded-full transition-all', i === n - 1 ? 'w-5 bg-neon-400' : 'w-1.5 bg-white/20')} />
      ))}
    </div>
  );

  const controls = (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        {n > 1 && !last && key !== 'welcome' && (
          <Button variant="ghost" onClick={back}>
            {t('Back')}
          </Button>
        )}
        <Button block onClick={goNext}>
          {key === 'welcome' ? t('Start the tour') : last ? t('Go to my career') : t('Next')} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {dots}
      {!last && (
        <button onClick={skip} className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-zinc-400 active:text-zinc-200">
          {t('Skip the tutorial')} <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const content = tour ? (
    // the spotlight tour: a ring on the tab, the card above the tab bar
    <>
      <div className="absolute inset-0 bg-black/10" />
      {rect && (
        <motion.div
          initial={false}
          animate={{ left: rect.x - 6, top: rect.y - 4, width: rect.w + 12, height: rect.h + 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="pointer-events-none absolute rounded-2xl ring-2 ring-neon-300"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.62), 0 0 30px rgba(52,211,153,0.5)' }}
        />
      )}
      <div className="absolute inset-x-0 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] mx-auto max-w-[430px] px-4">
        <Card strong className="p-4">
          <h2 className="font-display text-2xl font-extrabold uppercase leading-none">{t(tour.title)}</h2>
          <p className="mt-1.5 text-sm leading-snug text-zinc-300">{t(tour.text)}</p>
          {controls}
        </Card>
      </div>
    </>
  ) : (
    <div className="absolute inset-0 flex items-start justify-center overflow-y-auto bg-zinc-950/92 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="w-full max-w-[430px]">
        <Card strong className="p-4">
          {body}
          {controls}
        </Card>
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      <motion.div key="tutorial" className="fixed inset-0 z-[75]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {content}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
