import { cn } from '@/lib/utils';

export function Crest({ short, color, size = 40, className }: { short: string; color: string; size?: number; className?: string }) {
  return (
    <div
      className={cn('relative flex shrink-0 items-center justify-center font-display font-extrabold tracking-wide text-white', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 46" className="absolute inset-0 h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
        <defs>
          <linearGradient id={`g-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path d="M20 1.5 37 7v17c0 10-7.5 16.5-17 20.5C10.500 40.500 3 34 3 24V7z" fill={`url(#g-${color.slice(1)})`} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        <path d="M20 1.5 37 7v6H3V7z" fill="rgba(255,255,255,0.16)" />
      </svg>
      <span className="relative text-[0.34em] leading-none" style={{ fontSize: size * 0.34, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {short.slice(0, 3)}
      </span>
    </div>
  );
}
