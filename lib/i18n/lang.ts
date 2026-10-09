'use client';

import { create } from 'zustand';

export type Lang = 'en' | 'fr';

const KEY = 'fcs-lang';

interface LangStore {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Reads the saved choice (or the browser language) once on the client. */
  init: () => void;
}

const apply = (lang: Lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
};

export const useLangStore = create<LangStore>((set) => ({
  lang: 'en',
  setLang: (lang) => {
    try {
      window.localStorage.setItem(KEY, lang);
    } catch {
      /* private mode: the choice just won't persist */
    }
    apply(lang);
    set({ lang });
  },
  init: () => {
    let lang: Lang = 'en';
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'fr' || saved === 'en') lang = saved;
      else if (navigator.language?.toLowerCase().startsWith('fr')) lang = 'fr';
    } catch {
      /* ignore */
    }
    apply(lang);
    set({ lang });
  },
}));

export const getLang = (): Lang => useLangStore.getState().lang;
