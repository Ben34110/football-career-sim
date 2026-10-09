'use client';

import { useCallback } from 'react';
import { FR, FR_PATTERNS } from './fr';
import { getLang, useLangStore, type Lang } from './lang';

export type Vars = Record<string, string | number>;

const interpolate = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

function lookup(lang: Lang, text: string): string {
  // "Home|nav": the part after "|" only disambiguates the French translation
  if (lang === 'en') return text.includes('|') ? text.split('|')[0] : text;
  const hit = FR[text];
  if (hit !== undefined) return hit;
  for (const [re, out] of FR_PATTERNS) {
    const m = re.exec(text);
    if (m) return out(m);
  }
  return text;
}

/** Translate outside React (engine, store). Reads the current language. */
export function translate(text: string, vars?: Vars): string {
  return interpolate(lookup(getLang(), text), vars);
}

/**
 * Translation function bound to the active language. Using the hook makes the
 * component re-render when the language is switched.
 *
 * Keys are the English strings; `{name}` placeholders are filled from `vars`.
 * Strings that were stored already interpolated ("Matchday 3") are handled by
 * the pattern table in `fr.ts`.
 */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return useCallback((text: string, vars?: Vars) => interpolate(lookup(lang, text), vars), [lang]);
}

export function useLang() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  return { lang, setLang };
}

/** "1st" / "2nd" … or "1er" / "2e" */
export function ordinalOf(n: number, lang: Lang = getLang()): string {
  if (lang === 'fr') return n === 1 ? '1er' : `${n}e`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
