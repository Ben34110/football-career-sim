'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Same order as the tab bar: the page slides in from the side it sits on, whether you swiped or tapped the tab. */
const ORDER = ['/home', '/calendar', '/match', '/shop', '/profile'];
let previous = -1;

/** A template is mounted again on every navigation, so each page gets a short entrance (opacity + a small slide: cheap and smooth). */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const idx = ORDER.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`));
  const dir = useRef<number | null>(null);
  if (dir.current === null) dir.current = previous < 0 || idx < 0 || previous === idx ? 0 : idx > previous ? 1 : -1;
  useEffect(() => {
    if (idx >= 0) previous = idx;
  }, [idx]);

  return (
    <motion.div initial={{ opacity: 0, x: reduce ? 0 : (dir.current ?? 0) * 34 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.24, ease: [0.22, 0.8, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
