import { BEARD_STYLES, DEFAULT_LOOK, HAIR_COLORS, SKINS, type Look } from '@/lib/data/look';
import { cn } from '@/lib/utils';

/** Darken (negative) or lighten a #rrggbb colour. */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

interface Props {
  look?: Look;
  size?: number;
  className?: string;
  /** Round, framed portrait (default) or a bare head */
  framed?: boolean;
}

/** Hair that sits behind the head. */
function HairBack({ style, c }: { style: Look['hair']; c: string }) {
  switch (style) {
    case 'afro':
      return <circle cx="50" cy="36" r="33" fill={c} />;
    case 'long':
      return <path d="M23 46C18 20 34 9 50 9s32 11 27 37l3 38c-9 5-51 5-60 0z" fill={c} />;
    case 'braids':
      return (
        <g stroke={c} strokeWidth="5.5" strokeLinecap="round" fill="none">
          <path d="M26 36C21 50 20 62 21 76" />
          <path d="M31 31C27 48 26 64 27 82" />
          <path d="M36 28C33 46 32 62 33 84" />
          <path d="M74 36C79 50 80 62 79 76" />
          <path d="M69 31C73 48 74 64 73 82" />
          <path d="M64 28C67 46 68 62 67 84" />
        </g>
      );
    default:
      return null;
  }
}

/** Hair that frames the forehead. */
function HairFront({ style, c }: { style: Look['hair']; c: string }) {
  const hl = shade(c, 0.18);
  switch (style) {
    case 'buzz':
      return <path d="M26 44C25 24 37 18 50 18s25 6 24 26c-3-9-10-14-24-14S29 35 26 44z" fill={c} opacity=".88" />;
    case 'short':
      return <path d="M25 46C21 22 37 12 52 13c16 1 27 11 23 33-3-9-8-15-18-16-9 4-22 2-29 10z" fill={c} />;
    case 'quiff':
      return (
        <g fill={c}>
          <path d="M25 44C18 20 40 3 61 9c16 5 21 20 14 35-3-12-11-17-25-17-12 0-21 6-25 17z" />
          <path d="M44 12c8-6 22-5 27 3-9-3-18-2-27-3z" fill={hl} opacity=".5" />
        </g>
      );
    case 'afro':
      return <path d="M26 45C24 26 36 20 50 20s26 6 24 25c-3-9-10-13-24-13S29 36 26 45z" fill={c} />;
    case 'curls':
      return (
        <g fill={c}>
          <circle cx="29" cy="33" r="9" />
          <circle cx="39" cy="23" r="10" />
          <circle cx="51" cy="19" r="10.5" />
          <circle cx="63" cy="23" r="10" />
          <circle cx="72" cy="33" r="9" />
          <circle cx="26" cy="43" r="6" />
          <circle cx="75" cy="43" r="6" />
          <path d="M27 44C27 33 36 29 50 29s23 4 23 15c-3-8-10-12-23-12S30 36 27 44z" />
        </g>
      );
    case 'long':
      return <path d="M24 50C19 22 36 11 52 12c17 1 28 12 24 38-2-10-6-18-14-21-12 6-25 4-30 7-4 4-6 9-8 14z" fill={c} />;
    case 'braids':
      return <path d="M26 44C25 24 37 17 50 17s25 7 24 27c-3-9-10-14-24-14S29 35 26 44z" fill={c} />;
    default:
      return null;
  }
}

function Beard({ style, c }: { style: Look['beard']; c: string }) {
  switch (style) {
    case 'stubble':
      return <path d="M27 52c1 18 11 27 23 27s22-9 23-27c-3 11-11 17-23 17S30 63 27 52z" fill={c} opacity=".3" />;
    case 'short':
      return <path d="M26 50c0 22 11 31 24 31s24-9 24-31c-3 13-11 18-24 18S29 63 26 50z" fill={c} opacity=".92" />;
    case 'full':
      return (
        <g fill={c}>
          <path d="M25 48c-1 26 11 36 25 36s26-10 25-36c-3 14-11 17-25 17S28 62 25 48z" />
          <path d="M39 60c4-3 18-3 22 0-3 3-7 3-11 3s-8 0-11-3z" />
        </g>
      );
    default:
      return null;
  }
}

export function HeadAvatar({ look = DEFAULT_LOOK, size = 96, className, framed = true }: Props) {
  const skin = SKINS[look.skin] ?? SKINS[2];
  const skinDark = shade(skin, -0.14);
  const hairHex = (HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]).hex;
  const darkSkin = look.skin >= 4;
  const hasBeard = BEARD_STYLES.includes(look.beard) && look.beard !== 'none';
  const lip = shade(skin, darkSkin ? 0.02 : -0.28);
  const brow = look.hair === 'bald' ? shade(skin, -0.55) : shade(hairHex, -0.1);

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('shrink-0', className)} role="img" aria-hidden>
      <defs>
        <radialGradient id="ha-bg" cx=".5" cy=".3" r=".9">
          <stop offset="0" stopColor="#27272a" />
          <stop offset="1" stopColor="#09090b" />
        </radialGradient>
        <linearGradient id="ha-kit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <clipPath id="ha-clip">
          <circle cx="50" cy="50" r="49" />
        </clipPath>
      </defs>

      <g clipPath={framed ? 'url(#ha-clip)' : undefined}>
        {framed && <rect width="100" height="100" fill="url(#ha-bg)" />}
        {framed && <circle cx="50" cy="42" r="40" fill="#10b981" opacity=".09" />}

        <HairBack style={look.hair} c={hairHex} />

        {/* neck + shirt */}
        <path d="M41 62h18v20c-4 5-14 5-18 0z" fill={skinDark} />
        <path d="M6 104c1-14 15-22 34-24 6 6 14 6 20 0 19 2 33 10 34 24z" fill="url(#ha-kit)" />
        <path d="M38 80c4 9 20 9 24 0" fill="none" stroke="#f2c14e" strokeWidth="2.6" strokeLinecap="round" />

        {/* ears */}
        <ellipse cx="26.500" cy="51" rx="4.200" ry="5.600" fill={skin} />
        <ellipse cx="73.500" cy="51" rx="4.200" ry="5.600" fill={skin} />
        <ellipse cx="26.800" cy="51" rx="2" ry="3" fill={skinDark} opacity=".55" />
        <ellipse cx="73.200" cy="51" rx="2" ry="3" fill={skinDark} opacity=".55" />

        {/* face */}
        <path d="M27 44c0-17 10-26 23-26s23 9 23 26c0 22-9 35-23 35S27 66 27 44z" fill={skin} />
        <path d="M30 60c4 11 11 17 20 17s16-6 20-17c-3 12-10 20-20 20S33 72 30 60z" fill={skinDark} opacity=".35" />

        {/* brows, eyes, nose */}
        <g stroke={brow} strokeWidth="2.600" strokeLinecap="round" fill="none">
          <path d="M34.500 42.500c3-2 7-2 10 0" />
          <path d="M55.500 42.500c3-2 7-2 10 0" />
        </g>
        <g>
          <ellipse cx="39.500" cy="49" rx="3.600" ry="2.900" fill="#fafafa" />
          <ellipse cx="60.500" cy="49" rx="3.600" ry="2.900" fill="#fafafa" />
          <circle cx="40" cy="49.200" r="2.100" fill="#2a1a12" />
          <circle cx="60" cy="49.200" r="2.100" fill="#2a1a12" />
          <circle cx="40.700" cy="48.400" r=".7" fill="#fff" />
          <circle cx="60.700" cy="48.400" r=".7" fill="#fff" />
        </g>
        <path d="M50 50c-1.500 5-3.500 8-4 9.500 2 1.800 6 1.800 8 0-.5-1.500-2.500-4.500-4-9.500z" fill={skinDark} opacity=".5" />

        <Beard style={look.beard} c={hairHex} />

        {/* mouth */}
        <path d="M43 66.500c4 3.200 10 3.200 14 0" fill="none" stroke={hasBeard ? shade(skin, -0.2) : lip} strokeWidth="2.400" strokeLinecap="round" />

        <HairFront style={look.hair} c={hairHex} />
      </g>
      {framed && <circle cx="50" cy="50" r="48.500" fill="none" stroke="#f2c14e" strokeOpacity=".5" strokeWidth="1.600" />}
    </svg>
  );
}
