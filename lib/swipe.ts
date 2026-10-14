'use client';

import { useMemo, useRef } from 'react';

/**
 * Horizontal swipe between pages. A swipe is a quick, mostly horizontal flick of at least 80 px; it is ignored when it starts
 * on something that uses horizontal gestures itself (sliders, inputs, scrolling strips) or while a sheet is open.
 */
const MIN_DX = 80;
const MAX_DY = 60;
const MAX_MS = 750;

function blocked(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') return true;
  if (document.querySelector('[role=dialog]')) return true;
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    if (el.matches('[data-no-swipe], input, textarea, select, [role=slider], canvas')) return true;
    const style = window.getComputedStyle(el);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 4) return true;
    el = el.parentElement;
  }
  return false;
}

export function useSwipe(onLeft?: () => void, onRight?: () => void) {
  const start = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);
  return useMemo(
    () => ({
      onTouchStart: (e: React.TouchEvent) => {
        const p = e.touches[0];
        start.current = { x: p.clientX, y: p.clientY, t: Date.now(), ok: e.touches.length === 1 && !blocked(e.target) };
      },
      onTouchEnd: (e: React.TouchEvent) => {
        const s = start.current;
        start.current = null;
        if (!s || !s.ok) return;
        const p = e.changedTouches[0];
        const dx = p.clientX - s.x;
        const dy = p.clientY - s.y;
        if (Date.now() - s.t > MAX_MS || Math.abs(dx) < MIN_DX || Math.abs(dy) > MAX_DY || Math.abs(dx) < Math.abs(dy) * 1.8) return;
        if (dx < 0) onLeft?.();
        else onRight?.();
      },
    }),
    [onLeft, onRight],
  );
}
