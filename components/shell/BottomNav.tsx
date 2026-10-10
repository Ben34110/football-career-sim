'use client';

import { motion } from 'framer-motion';
import { CalendarDays, Home, ShoppingBag, UserRound, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { haptic } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/home', label: 'Home|nav', icon: Home },
  { href: '/calendar', label: 'Season', icon: CalendarDays },
  { href: '/match', label: 'Play', icon: Zap, hero: true },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav
      aria-label={t('Primary')}
      className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-white/[0.08] bg-zinc-950/80 backdrop-blur-2xl"
    >
      <ul className="grid grid-cols-5 items-end px-2 pt-1.5">
        {TABS.map(({ href, label, icon: Icon, hero }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => haptic(8)}
                aria-current={active ? 'page' : undefined}
                className="group relative flex flex-col items-center gap-0.5 pb-2 pt-1"
              >
                {hero ? (
                  <motion.span
                    whileTap={{ scale: 0.88 }}
                    className={cn(
                      '-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-shadow',
                      active
                        ? 'border-neon-300 bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon'
                        : 'border-white/15 bg-gradient-to-b from-zinc-700 to-zinc-900 text-neon-300 shadow-gloss',
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.4} />
                  </motion.span>
                ) : (
                  <motion.span whileTap={{ scale: 0.85 }} className="relative flex h-8 w-12 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-neon-400/15"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className={cn('relative h-[22px] w-[22px] transition-colors', active ? 'text-neon-300' : 'text-zinc-500')} />
                  </motion.span>
                )}
                <span className={cn('text-[10px] font-semibold tracking-wide', active ? 'text-zinc-100' : 'text-zinc-500')}>{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
