import { useId } from 'react';

export type TrophyKind = 'cup' | 'bigears' | 'europa' | 'league' | 'globe' | 'ballon' | 'continental' | 'medal';

/**
 * Trophies, drawn in a 28 × 44 box centred on (0, 0): the same size whatever the shape,
 * so any of them can sit in the hands of the player in a scene.
 */
export function TrophyArt({ kind, accent = '#16a34a' }: { kind: TrophyKind; accent?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gold = `gold${uid}`;
  const silver = `silver${uid}`;
  const green = `green${uid}`;
  return (
    <g>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b97708" />
        </linearGradient>
        <linearGradient id={silver} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#cfd6de" />
          <stop offset="1" stopColor="#7d8794" />
        </linearGradient>
        <linearGradient id={green} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#065f46" />
        </linearGradient>
      </defs>

      {/* classic cup with two handles */}
      {kind === 'cup' && (
        <g>
          <path d="M-12 -14C-23 -16 -22 0 -11 1.500M12 -14C23 -16 22 0 11 1.500" fill="none" stroke="#a96a0a" strokeWidth="3.600" strokeLinecap="round" />
          <path d="M-12 -14C-23 -16 -22 0 -11 1.500M12 -14C23 -16 22 0 11 1.500" fill="none" stroke={`url(#${gold})`} strokeWidth="2" strokeLinecap="round" />
          <path d="M-12.500 -20H12.500V-8C12.500 3.500 6.500 7.500 0 7.500C-6.500 7.500 -12.500 3.500 -12.500 -8Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".9" strokeLinejoin="round" />
          <path d="M-2.500 7H2.500L3.500 15H-3.500Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".7" />
          <rect x="-10" y="14.500" width="20" height="5.500" rx="1.800" fill="#c98a12" stroke="#8a5606" strokeWidth=".7" />
          <path d="M-8 -16C-9.500 -8 -7.500 -1 -3.500 3" stroke="#fff" strokeWidth="1.800" fill="none" opacity=".75" strokeLinecap="round" />
        </g>
      )}

      {/* the "big ears" European cup: huge handles, slim body */}
      {(kind === 'bigears' || kind === 'europa') && (
        <g>
          <path d="M-5 -12C-26 -26 -26 8 -6 8M5 -12C26 -26 26 8 6 8" fill="none" stroke={kind === 'bigears' ? '#6b7280' : '#9a5b10'} strokeWidth="4.200" strokeLinecap="round" />
          <path d="M-5 -12C-26 -26 -26 8 -6 8M5 -12C26 -26 26 8 6 8" fill="none" stroke={`url(#${kind === 'bigears' ? silver : gold})`} strokeWidth="2.600" strokeLinecap="round" />
          <path d="M-8 -20H8L9 -6C9 2 4 6 0 6C-4 6 -9 2 -9 -6Z" fill={`url(#${kind === 'bigears' ? silver : gold})`} stroke={kind === 'bigears' ? '#6b7280' : '#a96a0a'} strokeWidth=".9" strokeLinejoin="round" />
          <path d="M-2.500 6H2.500L4 15H-4Z" fill={`url(#${kind === 'bigears' ? silver : gold})`} stroke="#6b7280" strokeWidth=".7" />
          <rect x="-10" y="14.500" width="20" height="5.500" rx="1.800" fill="#374151" stroke="#111827" strokeWidth=".7" />
          <path d="M-5 -17C-6 -10 -5 -4 -2 0" stroke="#fff" strokeWidth="1.600" fill="none" opacity=".8" strokeLinecap="round" />
          {kind === 'bigears' && (
            <g fill="#1d4ed8" opacity=".85">
              {[-3, 0, 3].map((x) => (
                <circle key={x} cx={x} cy="-8" r=".9" />
              ))}
            </g>
          )}
        </g>
      )}

      {/* the league trophy: tall, gold, on a green base */}
      {kind === 'league' && (
        <g>
          <path d="M-9 -21H9L7 -9C6 -4 3 -2 0 -2C-3 -2 -6 -4 -7 -9Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".9" strokeLinejoin="round" />
          <path d="M-9 -21L-5 -25L-2 -21L0 -26L2 -21L5 -25L9 -21Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M-2 -2H2L3 6H-3Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".7" />
          <path d="M-7 6H7L9 12H-9Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".8" strokeLinejoin="round" />
          <rect x="-12" y="12" width="24" height="9" rx="2" fill={`url(#${green})`} stroke="#064e3b" strokeWidth=".8" />
          <path d="M-9 14H9" stroke="#fbbf24" strokeWidth=".9" />
          <path d="M-6 -19C-7 -13 -6 -9 -4 -6" stroke="#fff" strokeWidth="1.500" fill="none" opacity=".75" strokeLinecap="round" />
        </g>
      )}

      {/* the world cup: a globe held up by a spiral */}
      {kind === 'globe' && (
        <g>
          <path d="M-7 14C-9 6 -5 2 0 -2C5 2 9 6 7 14Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".9" strokeLinejoin="round" />
          <circle cx="0" cy="-10" r="11" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".9" />
          <path d="M-10.500 -10H10.500M0 -21V1M-8 -17C-3 -13 3 -13 8 -17M-8 -3C-3 -7 3 -7 8 -3" fill="none" stroke="#a96a0a" strokeWidth=".6" opacity=".7" />
          <rect x="-11" y="13" width="22" height="7" rx="1.800" fill={`url(#${green})`} stroke="#064e3b" strokeWidth=".8" />
          <path d="M-6 -16C-8 -11 -7 -6 -4 -3" stroke="#fff" strokeWidth="1.600" fill="none" opacity=".8" strokeLinecap="round" />
        </g>
      )}

      {/* the golden ball */}
      {kind === 'ballon' && (
        <g>
          <path d="M-9 14L-6 8H6L9 14Z" fill="#3f3f46" stroke="#18181b" strokeWidth=".8" strokeLinejoin="round" />
          <rect x="-11" y="14" width="22" height="6" rx="1.500" fill="#27272a" stroke="#18181b" strokeWidth=".8" />
          <circle cx="0" cy="-5" r="13.500" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth="1" />
          <polygon points="0,-11 5.500,-7 3.500,-.5 -3.500,-.5 -5.500,-7" fill="#a96a0a" opacity=".8" />
          <path d="M0 -11V-18M5.500 -7L12 -9.500M3.500 -.5L8 5M-3.500 -.5L-8 5M-5.500 -7L-12 -9.500" stroke="#a96a0a" strokeWidth=".8" opacity=".8" />
          <path d="M-9 -13C-5 -17 1 -18 5 -17" stroke="#fff" strokeWidth="1.800" fill="none" opacity=".85" strokeLinecap="round" />
        </g>
      )}

      {/* a continental / national-team cup: gold with a ribbon in the competition's colour */}
      {kind === 'continental' && (
        <g>
          <path d="M-11 -16C-21 -18 -20 -2 -10 -.5M11 -16C21 -18 20 -2 10 -.5" fill="none" stroke="#a96a0a" strokeWidth="3.400" strokeLinecap="round" />
          <path d="M-11 -16C-21 -18 -20 -2 -10 -.5M11 -16C21 -18 20 -2 10 -.5" fill="none" stroke={`url(#${gold})`} strokeWidth="1.800" strokeLinecap="round" />
          <path d="M-12 -22H12V-10C12 1 6 5 0 5C-6 5 -12 1 -12 -10Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".9" strokeLinejoin="round" />
          <path d="M-12 -12C-5 -8 5 -8 12 -12L12 -7C5 -3 -5 -3 -12 -7Z" fill={accent} opacity=".9" />
          <path d="M-3 5H3L4 13H-4Z" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth=".7" />
          <rect x="-10" y="12.500" width="20" height="6.500" rx="1.800" fill={accent} stroke="#111827" strokeWidth=".7" opacity=".95" />
          <path d="M-8 -19C-9.500 -11 -7.500 -4 -3.500 0" stroke="#fff" strokeWidth="1.600" fill="none" opacity=".75" strokeLinecap="round" />
        </g>
      )}

      {/* a gold medal on its ribbon */}
      {kind === 'medal' && (
        <g>
          <path d="M-9 -22L-2 -4M9 -22L2 -4" stroke={accent} strokeWidth="5" strokeLinecap="butt" />
          <circle cx="0" cy="4" r="13" fill={`url(#${gold})`} stroke="#a96a0a" strokeWidth="1.100" />
          <circle cx="0" cy="4" r="9" fill="none" stroke="#a96a0a" strokeWidth=".8" opacity=".7" />
          <path d="M0 -2L1.800 2.500L6.500 2.800L2.800 5.800L4 10.500L0 8L-4 10.500L-2.800 5.800L-6.500 2.800L-1.800 2.500Z" fill="#fff3b0" stroke="#a96a0a" strokeWidth=".5" />
          <path d="M-8 -3C-6 -7 -2 -8 1 -7" stroke="#fff" strokeWidth="1.600" fill="none" opacity=".8" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}
