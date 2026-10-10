import { flagUrl } from '@/lib/flags';
import { cn } from '@/lib/utils';

/** A country flag as real artwork. `size` is the height in px (flags are 4:3). Falls back to the emoji. */
export function Flag({ emoji, size = 16, className }: { emoji: string; size?: number; className?: string }) {
  const url = flagUrl(emoji);
  if (!url) return <span className={className}>{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      width={Math.round((size * 4) / 3)}
      height={size}
      draggable={false}
      className={cn('inline-block shrink-0 rounded-[2px] object-cover align-[-0.18em] shadow-[0_0_0_0.5px_rgba(255,255,255,0.3)]', className)}
    />
  );
}
