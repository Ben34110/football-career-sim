'use client';

import { Logo } from '@/components/ui/Logo';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The waiting screen: the logo floating over a pulsing ring, with a moving bar underneath.
 * It fades in a quarter of a second late, so a wait that is over at once never flashes it.
 *
 * - `fullscreen` fills the frame (loading the save).
 * - `overlay` dims what is behind and blocks it (a payment in progress).
 * - `compact` is the inline version, for a part of the screen that is still loading.
 */
export function WaitScreen({
  message,
  variant = 'fullscreen',
  className,
}: {
  message?: string;
  variant?: 'fullscreen' | 'overlay' | 'compact';
  className?: string;
}) {
  const t = useT();
  const text = t(message ?? 'Loading…');
  const compact = variant === 'compact';
  const logo = compact ? 56 : 112;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      className={cn(
        'flex flex-col items-center justify-center gap-5 text-center animate-waitFade',
        variant === 'fullscreen' && 'min-h-dvh',
        variant === 'overlay' && 'fixed inset-0 z-[70] mx-auto max-w-[430px] bg-zinc-950/85 backdrop-blur-md',
        compact && 'min-h-[50dvh]',
        className,
      )}
    >
      <div className="relative flex items-center justify-center" style={{ width: logo * 1.35, height: logo * 1.35 }}>
        <span aria-hidden className="absolute inset-0 rounded-full border border-neon-400/40 animate-pulseRing" />
        <span aria-hidden className="absolute inset-[12%] rounded-full bg-neon-400/10 blur-xl" />
        <Logo size={logo} priority className="relative animate-floaty drop-shadow-[0_8px_24px_rgba(16,224,138,0.35)]" />
      </div>
      {!compact && <div className="font-display text-xl font-extrabold uppercase leading-none tracking-wide text-zinc-100">Pitch <span className="text-gold-300">Legacy</span></div>}
      <div className="flex flex-col items-center gap-2.5">
        <div className="relative h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <span className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-neon-500 to-neon-300 animate-loadbar" />
        </div>
        <p className="text-xs font-semibold text-zinc-500">{text}</p>
      </div>
    </div>
  );
}
