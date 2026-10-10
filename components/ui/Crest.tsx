import { useId } from 'react';
import { cn } from '@/lib/utils';

const IS_FLAG = /^(\p{Regional_Indicator}{2}|\u{1F3F4})/u;
const SHIELD = 'M20 1.5 37 7v17c0 10-7.5 16.5-17 20.5C10.500 40.500 3 34 3 24V7z';

export function Crest({ short, color, size = 40, className }: { short: string; color: string; size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const flag = IS_FLAG.test(short);

  if (flag) {
    // a national side: the shield is filled with its flag (a blurred copy fills the corners, a sharp one sits in the middle)
    return (
      <div className={cn('relative flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }} aria-hidden>
        <svg viewBox="0 0 40 46" className="absolute inset-0 h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
          <defs>
            <clipPath id={`c${uid}`}>
              <path d={SHIELD} />
            </clipPath>
            <filter id={`b${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <g clipPath={`url(#c${uid})`}>
            <rect width="40" height="46" fill="#3f3f46" />
            <text x="20" y="42" fontSize="84" textAnchor="middle" filter={`url(#b${uid})`}>
              {short}
            </text>
            <g transform="translate(20 23.500) scale(1 1.28) translate(-20 -23.500)">
              <text x="20" y="43" fontSize="52" textAnchor="middle">
                {short}
              </text>
            </g>
            <path d="M20 1.5 37 7v6H3V7z" fill="rgba(255,255,255,0.14)" />
          </g>
          <path d={SHIELD} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

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
        <path d={SHIELD} fill={`url(#g-${color.slice(1)})`} stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        <path d="M20 1.5 37 7v6H3V7z" fill="rgba(255,255,255,0.16)" />
      </svg>
      <span className="relative text-[0.34em] leading-none" style={{ fontSize: size * 0.34, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {short.slice(0, 3)}
      </span>
    </div>
  );
}
