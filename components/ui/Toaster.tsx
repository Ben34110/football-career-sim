'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { useToastStore } from '@/lib/toast';
import { cn } from '@/lib/utils';

const ICONS = { good: CheckCircle2, bad: AlertTriangle, neutral: Info, gold: Sparkles };
const TONES = {
  good: 'border-neon-400/40 text-neon-300',
  bad: 'border-crimson-500/40 text-crimson-400',
  neutral: 'border-white/15 text-zinc-200',
  gold: 'border-gold-400/40 text-gold-300',
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-[430px] flex-col gap-2 px-4 pt-safe">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ y: -40, opacity: 0, scale: 0.96 }}
              animate={{ y: 8, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={cn('glass-strong pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold', TONES[t.tone])}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-zinc-100">{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
