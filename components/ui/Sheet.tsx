'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** iOS-style bottom sheet */
export function Sheet({
  open,
  children,
  className,
  dismissible = false,
  onClose,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  onClose?: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex max-w-[430px] items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn('glass-strong gloss-edge relative w-full rounded-b-none rounded-t-[28px] px-4 pt-3 pb-safe', className)}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="pb-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
