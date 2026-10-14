import { motionValue } from 'framer-motion';

/** The tab pages in the order they sit side by side. */
export const PAGER_PAGES = ['/home', '/calendar', '/shop', '/profile'] as const;

/** Where the strip of pages is, as a number of pages (0 = Home … 3 = Profile): follows the finger, read by the tab bar. */
export const pagerProgress = motionValue(0);

export const pagerIndexOf = (pathname: string) => PAGER_PAGES.findIndex((p) => pathname === p || pathname.startsWith(`${p}/`));
