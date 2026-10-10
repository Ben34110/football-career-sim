'use client';

import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';

/** iOS-style bottom sheet: swipe the handle down, or tap outside, to close (when dismissible). */
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
  const controls = useDragControls();
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
            drag={dismissible ? 'y' : false}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose?.();
            }}
          >
            {/* the handle is a generous grab area: drag it down to dismiss */}
            <div
              onPointerDown={(e) => dismissible && controls.start(e)}
              className={cn('-mx-4 -mt-3 mb-1 flex h-10 items-center justify-center', dismissible && 'cursor-grab touch-none')}
              aria-hidden
            >
              <div className="h-1 w-10 rounded-full bg-white/25" />
            </div>
            <div className="pb-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
