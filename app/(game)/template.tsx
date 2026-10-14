'use client';

import { motion } from 'framer-motion';

/**
 * A template is mounted again on every navigation, so each page fades in. Opacity only, on purpose: a transform on this
 * wrapper would become the reference of every `position: fixed` button inside the page (the draw's "to the match" button
 * would first appear in the middle of the page, then jump to the bottom when the animation ends).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
