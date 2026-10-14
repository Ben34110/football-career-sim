'use client';

import { animate, motion, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarScreen } from '@/components/screens/CalendarScreen';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { ShopScreen } from '@/components/screens/ShopScreen';
import { haptic } from '@/lib/haptics';
import { pagerProgress } from '@/lib/pager';
import { useUiStore } from '@/lib/ui';

const PAGES = [HomeScreen, CalendarScreen, ShopScreen, ProfileScreen];
const N = PAGES.length;
const EDGE_RESISTANCE = 0.32;

/** Things that use horizontal gestures themselves: a swipe that starts on them is not a page swipe. */
function blocked(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el) {
    if (el.hasAttribute('data-pane')) return false; // the page itself scrolls up and down only
    if (el.matches('[data-no-swipe], input, textarea, select, [role=slider], canvas')) return true;
    const style = window.getComputedStyle(el);
    if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 4) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * The four tab pages side by side on one strip. The strip follows the finger, so between two pages you see half of each;
 * on release it settles on the nearest page (or the next one for a quick flick). Every page scrolls on its own.
 * Tapping a tab slides the strip there too.
 */
export function TabPager({ active, onSettle }: { active: number; onSettle: (index: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; base: number; start: number; mode: 'pending' | 'drag'; last: { x: number; t: number }[] } | null>(null);
  const justDragged = useRef(false);
  const current = useRef(active);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the tab bar follows the strip
  useMotionValueEvent(x, 'change', (v) => {
    if (width) pagerProgress.set(-v / width);
  });

  // a tab was tapped (or the route changed): slide there. The first time, just be there.
  const placed = useRef(false);
  useEffect(() => {
    if (!width) return;
    const target = -active * width;
    current.current = active;
    if (!placed.current) {
      placed.current = true;
      x.set(target);
      pagerProgress.set(active);
      return;
    }
    if (drag.current?.mode === 'drag') return;
    if (Math.abs(x.get() - target) < 0.5) return;
    anim.current?.stop();
    anim.current = animate(x, target, { type: 'spring', stiffness: 360, damping: 38, mass: 0.9 });
  }, [active, width, x]);

  // a trophy won earlier is celebrated as soon as you are back on the home page
  useEffect(() => {
    if (active === 0) useUiStore.getState().releaseCelebrations();
  }, [active]);

  // touch events (not pointer events): the browser cancels a pointer sequence as soon as it takes over a gesture,
  // and the move listener has to be non-passive so that a horizontal swipe is never also a scroll
  const widthRef = useRef(0);
  widthRef.current = width;

  useEffect(() => {
    const el = box.current;
    if (!el) return;

    const start = (e: TouchEvent) => {
      const w = widthRef.current;
      if (!w || e.touches.length !== 1 || drag.current || blocked(e.target)) return;
      const p = e.touches[0];
      anim.current?.stop();
      drag.current = { id: p.identifier, x0: p.clientX, y0: p.clientY, base: x.get(), start: current.current, mode: 'pending', last: [{ x: p.clientX, t: performance.now() }] };
    };

    const move = (e: TouchEvent) => {
      const d = drag.current;
      const w = widthRef.current;
      if (!d || !w) return;
      const p = Array.from(e.touches).find((t) => t.identifier === d.id);
      if (!p) return;
      const dx = p.clientX - d.x0;
      const dy = p.clientY - d.y0;
      if (d.mode === 'pending') {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          drag.current = null; // a vertical scroll: leave it to the page
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) d.mode = 'drag';
        else return;
      }
      if (e.cancelable) e.preventDefault();
      let next = d.base + dx;
      const min = -(N - 1) * w;
      if (next > 0) next *= EDGE_RESISTANCE;
      else if (next < min) next = min + (next - min) * EDGE_RESISTANCE;
      x.set(next);
      d.last.push({ x: p.clientX, t: performance.now() });
      if (d.last.length > 6) d.last.shift();
    };

    const end = () => {
      const d = drag.current;
      const w = widthRef.current;
      drag.current = null;
      if (!d || d.mode !== 'drag' || !w) return;
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 60);
      const a = d.last[0];
      const b = d.last[d.last.length - 1];
      const v = b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0; // px per ms
      // where it would end up with a little inertia, never more than one page away from where the swipe started
      const projected = -(x.get() + v * 180) / w;
      let target = Math.round(projected);
      // a swipe of more than a quarter of the page, or a quick flick, always turns the page
      const moved = x.get() - d.base;
      if (target === d.start && (Math.abs(moved) > w * 0.25 || Math.abs(v) > 0.35)) target = d.start + (moved < 0 || v < 0 ? 1 : -1);
      target = Math.max(0, Math.min(N - 1, Math.max(d.start - 1, Math.min(d.start + 1, target))));
      anim.current?.stop();
      anim.current = animate(x, -target * w, {
        type: 'spring',
        stiffness: 380,
        damping: 40,
        mass: 0.9,
        velocity: v * 1000,
        onComplete: () => {
          if (target !== current.current) {
            current.current = target;
            haptic(8);
            onSettleRef.current(target);
          }
        },
      });
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [x]);

  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  return (
    <div
      ref={box}
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onClickCapture={(e) => {
        // the tap that ends a swipe must not press whatever is under the finger
        if (justDragged.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <motion.div className="flex h-full will-change-transform" style={{ x, width: `${N * 100}%` }}>
        {PAGES.map((Page, i) => (
          <div key={i} className="h-full shrink-0 overflow-y-auto overscroll-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4" style={{ width: `${100 / N}%` }} data-pane aria-hidden={i !== active}>
            <Page />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
