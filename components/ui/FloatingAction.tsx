'use client';

import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useUiStore } from '@/lib/ui';
import { cn } from '@/lib/utils';

/**
 * Primary action pinned to the visible screen — it never waits at the bottom of a long page.
 * Sits above the tab bar when it is visible, and hugs the bottom edge during immersive phases.
 */
export function FloatingAction({ children }: { children: React.ReactNode }) {
  const immersive = useUiStore((s) => s.immersive);
  const bar = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'fixed inset-x-0 z-30 mx-auto max-w-[430px] bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent px-4 pt-8',
        immersive ? 'bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(4.4rem+env(safe-area-inset-bottom))] pb-2',
      )}
    >
      {children}
    </motion.div>
  );
  return (
    <>
      <div aria-hidden className="h-24" />
      {/* in the body, outside the page: an animated parent (a card that scales or slides in) would otherwise carry this
          fixed bar with it, and it would appear in the middle of the screen before dropping to the bottom */}
      {typeof document === 'undefined' ? bar : createPortal(bar, document.body)}
    </>
  );
}
