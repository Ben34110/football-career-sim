'use client';

import { create } from 'zustand';

export interface ToastItem {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral' | 'gold';
}

interface ToastStore {
  items: ToastItem[];
  push: (text: string, tone?: ToastItem['tone']) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  items: [],
  push: (text, tone = 'neutral') => {
    const id = ++seq;
    set({ items: [...get().items.slice(-2), { id, text, tone }] });
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, tone: ToastItem['tone'] = 'neutral') => useToastStore.getState().push(text, tone);
