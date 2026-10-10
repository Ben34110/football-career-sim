import { useId } from 'react';
import { BEARD_STYLES, DEFAULT_LOOK, EYE_COLORS, HAIR_COLORS, SKINS, type FaceShape, type Look } from '@/lib/data/look';
import { cn } from '@/lib/utils';

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255] as const;
};
const toHex = (r: number, g: number, b: number) => `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
/** Darken (negative) or lighten a #rrggbb colour. */
function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
  return toHex(f(r), f(g), f(b));
}
/** Blend two colours (t = 0 → a, 1 → b). */
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const FACE_PATH: Record<FaceShape, string> = {
  oval: 'M50 13C34 13 27 27 27 44C27 62 34 79 50 84C66 79 73 62 73 44C73 27 66 13 50 13Z',
  round: 'M50 14C33 14 25 28 25 46C25 65 35 82 50 83C65 82 75 65 75 46C75 28 67 14 50 14Z',
  square: 'M50 13C34 13 27 25 27 41C27 57 28 71 35 78C40 83 45 85 50 85C55 85 60 83 65 78C72 71 73 57 73 41C73 25 66 13 50 13Z',
};

interface Props {
  look?: Look;
  size?: number;
  className?: string;
  /** Round, framed portrait (default) or a bare head */
  framed?: boolean;
}

/** Hair that sits behind the head. */
function HairBack({ style, fill }: { style: Look['hair']; fill: string }) {
  switch (style) {
    case 'afro':
      return <circle cx="50" cy="36" r="33" fill={fill} />;
    case 'long':
      return <path d="M23 46C18 18 34 7 50 7s32 11 27 39l3 40c-9 5-51 5-60 0z" fill={fill} />;
    case 'braids':
      return (
        <g stroke={fill} strokeWidth="5.5" strokeLinecap="round" fill="none">
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
function HairFront({ style, fill, dark, light }: { style: Look['hair']; fill: string; dark: string; light: string }) {
  switch (style) {
    case 'buzz':
      return (
        <g>
          <path d="M26 42C25 22 36 14 50 14s25 8 24 28c-3-9-10-14-24-14S29 33 26 42z" fill={fill} opacity=".92" />
          <path d="M30 30C36 22 64 22 70 30" stroke={light} strokeWidth="1" fill="none" opacity=".25" />
        </g>
      );
    case 'short':
      return (
        <g>
          <path d="M25 46C21 20 37 9 52 10c16 1 27 11 23 36-3-9-8-15-18-16-9 4-22 2-29 10z" fill={fill} />
          <path d="M34 18C42 12 58 12 66 19" stroke={light} strokeWidth="1.6" fill="none" opacity=".3" strokeLinecap="round" />
          <g stroke={dark} strokeWidth=".6" fill="none" opacity=".4">
            <path d="M33 24C40 16 52 14 62 18" />
            <path d="M30 32C38 24 52 21 66 26" />
            <path d="M28 40C34 32 46 29 58 31" />
          </g>
        </g>
      );
    case 'quiff':
      return (
        <g>
          <path d="M25 44C18 18 40 1 61 7c16 5 21 20 14 35-3-12-11-17-25-17-12 0-21 6-25 17z" fill={fill} />
          <path d="M42 10c8-6 22-5 28 3-9-3-19-2-28-3z" fill={light} opacity=".5" />
          <g stroke={dark} strokeWidth=".6" fill="none" opacity=".4">
            <path d="M34 22C40 10 56 6 68 12" />
            <path d="M30 32C36 20 54 16 68 24" />
          </g>
        </g>
      );
    case 'afro':
      return (
        <g>
          <path d="M24 46C20 14 36 6 50 6s30 8 26 40c-3-9-10-15-26-15S27 37 24 46z" fill={fill} />
          <g fill={light} opacity=".22">
            <circle cx="38" cy="16" r="3.4" />
            <circle cx="56" cy="12" r="3" />
            <circle cx="66" cy="22" r="2.8" />
            <circle cx="30" cy="26" r="2.6" />
          </g>
          <g fill={dark} opacity=".3">
            <circle cx="46" cy="22" r="2.2" />
            <circle cx="60" cy="26" r="2" />
            <circle cx="34" cy="34" r="1.8" />
          </g>
        </g>
      );
    case 'curls':
      return (
        <g fill={fill}>
          <circle cx="29" cy="32" r="9" />
          <circle cx="39" cy="21" r="10" />
          <circle cx="51" cy="17" r="10.5" />
          <circle cx="63" cy="21" r="10" />
          <circle cx="72" cy="32" r="9" />
          <circle cx="26" cy="43" r="6" />
          <circle cx="75" cy="43" r="6" />
          <circle cx="36" cy="34" r="6.500" />
          <circle cx="44" cy="30" r="7" />
          <circle cx="56" cy="30" r="7" />
          <circle cx="64" cy="34" r="6.500" />
          <circle cx="50" cy="27" r="8" />
          <g fill={light} opacity=".25">
            <circle cx="40" cy="18" r="3" />
            <circle cx="54" cy="14" r="3" />
            <circle cx="30" cy="29" r="2.4" />
          </g>
          <g fill={dark} opacity=".3">
            <circle cx="47" cy="25" r="2.4" />
            <circle cx="62" cy="26" r="2.2" />
          </g>
        </g>
      );
    case 'long':
      return (
        <g>
          <path d="M24 50C19 20 36 9 52 10c17 1 28 12 24 40-2-10-6-18-14-21-12 6-25 4-30 7-4 4-6 9-8 14z" fill={fill} />
          <path d="M34 16C44 10 60 11 68 18" stroke={light} strokeWidth="1.6" fill="none" opacity=".3" strokeLinecap="round" />
          <g stroke={dark} strokeWidth=".6" fill="none" opacity=".4">
            <path d="M30 28C36 18 52 14 66 20" />
            <path d="M27 40C32 30 46 26 60 28" />
          </g>
        </g>
      );
    case 'braids':
      return (
        <g>
          <path d="M26 42C25 21 37 13 50 13s25 8 24 29c-3-9-10-14-24-14S29 33 26 42z" fill={fill} />
          <g stroke={dark} strokeWidth=".6" fill="none" opacity=".45">
            <path d="M32 24C38 17 50 15 62 20" />
            <path d="M30 32C38 24 52 22 68 28" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

export function HeadAvatar({ look = DEFAULT_LOOK, size = 96, className, framed = true }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${n}${uid}`;
  const url = (n: string) => `url(#${id(n)})`;

  const skin = SKINS[look.skin] ?? SKINS[2];
  const deep = look.skin >= 4;
  const skinHi = shade(skin, deep ? 0.12 : 0.16);
  const skinLo = shade(skin, -0.2);
  const skinDeep = shade(skin, -0.38);
  const hairHex = (HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]).hex;
  const hairDark = shade(hairHex, -0.32);
  const hairLight = shade(hairHex, hairHex === '#17120f' ? 0.45 : 0.3);
  const eyeHex = (EYE_COLORS[look.eyes ?? 1] ?? EYE_COLORS[1]).hex;
  const face = FACE_PATH[look.face ?? 'oval'];
  const hasBeard = BEARD_STYLES.includes(look.beard) && look.beard !== 'none';
  const brow = look.hair === 'bald' || look.hair === 'buzz' ? shade(skin, -0.58) : shade(hairHex, -0.18);
  const lip = mix(skin, deep ? '#6a2c2a' : '#b4514d', deep ? 0.5 : 0.55);
  const lipLo = mix(lip, '#ffffff', 0.12);
  const lash = '#1b1210';

  const eye = (cx: number, mirror: boolean) => {
    const sx = mirror ? -1 : 1;
    // almond eye drawn around (cx, 47); mirrored for the right eye
    const p = (dx: number, dy: number) => `${(cx + sx * dx).toFixed(2)} ${(47 + dy).toFixed(2)}`;
    const almond = `M${p(-5.6, 0.4)}C${p(-3.4, -2.8)} ${p(2.2, -3.1)} ${p(5.4, -0.6)}C${p(2.6, 2.4)} ${p(-2.8, 2.7)} ${p(-5.6, 0.4)}Z`;
    const top = `M${p(-5.9, 0.5)}C${p(-3.5, -3.1)} ${p(2.4, -3.4)} ${p(5.8, -0.9)}`;
    const lower = `M${p(-5, 1)}C${p(-2.6, 2.9)} ${p(2.2, 3)} ${p(5, 0.4)}`;
    const crease = `M${p(-5, -1.4)}C${p(-2.8, -4.4)} ${p(2.4, -4.6)} ${p(5.4, -2.4)}`;
    const clip = id(mirror ? 'eyeR' : 'eyeL');
    return (
      <g key={cx}>
        <ellipse cx={cx} cy={47.4} rx={7.4} ry={4.3} fill={skinDeep} opacity=".18" filter={url('b1')} />
        <clipPath id={clip}>
          <path d={almond} />
        </clipPath>
        <path d={almond} fill={url('sclera')} />
        <g clipPath={`url(#${clip})`}>
          <circle cx={cx + sx * 0.2} cy={46.9} r={3} fill={url('iris')} />
          <circle cx={cx + sx * 0.2} cy={46.9} r={3} fill="none" stroke={shade(eyeHex, -0.55)} strokeWidth=".5" opacity=".7" />
          <circle cx={cx + sx * 0.2} cy={46.9} r={1.15} fill="#0b0706" />
          <circle cx={cx + sx * 1.1} cy={45.9} r={0.62} fill="#fff" opacity=".95" />
          <ellipse cx={cx} cy={44.6} rx={5.4} ry={1.6} fill={skinDeep} opacity=".28" />
        </g>
        <path d={crease} fill="none" stroke={skinDeep} strokeWidth=".55" opacity=".55" strokeLinecap="round" />
        <path d={top} fill="none" stroke={lash} strokeWidth="1" strokeLinecap="round" />
        <path d={lower} fill="none" stroke={skinDeep} strokeWidth=".45" opacity=".5" strokeLinecap="round" />
      </g>
    );
  };

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('shrink-0', className)} role="img" aria-hidden>
      <defs>
        <radialGradient id={id('bg')} cx=".5" cy=".3" r=".9">
          <stop offset="0" stopColor="#2a2a2f" />
          <stop offset="1" stopColor="#09090b" />
        </radialGradient>
        <linearGradient id={id('kit')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14c28a" />
          <stop offset="1" stopColor="#046c4e" />
        </linearGradient>
        <linearGradient id={id('skin')} x1=".1" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor={skinHi} />
          <stop offset=".5" stopColor={skin} />
          <stop offset="1" stopColor={skinLo} />
        </linearGradient>
        <linearGradient id={id('neck')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skinDeep} />
          <stop offset=".55" stopColor={skinLo} />
          <stop offset="1" stopColor={skin} />
        </linearGradient>
        <radialGradient id={id('edge')} cx=".5" cy=".5" r=".62">
          <stop offset=".58" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0a05" stopOpacity=".34" />
        </radialGradient>
        <radialGradient id={id('blush')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={deep ? '#c0603f' : '#e0766a'} stopOpacity=".3" />
          <stop offset="1" stopColor={deep ? '#c0603f' : '#e0766a'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('nose')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={skinDeep} stopOpacity="0" />
          <stop offset=".72" stopColor={skinDeep} stopOpacity=".15" />
          <stop offset="1" stopColor={skinDeep} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('sclera')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6d3d1" />
          <stop offset=".5" stopColor="#fafaf9" />
          <stop offset="1" stopColor="#e7e5e4" />
        </linearGradient>
        <radialGradient id={id('iris')} cx=".45" cy=".4" r=".6">
          <stop offset="0" stopColor={shade(eyeHex, 0.4)} />
          <stop offset=".6" stopColor={eyeHex} />
          <stop offset="1" stopColor={shade(eyeHex, -0.5)} />
        </radialGradient>
        <linearGradient id={id('hair')} x1=".1" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor={shade(hairHex, 0.14)} />
          <stop offset=".55" stopColor={hairHex} />
          <stop offset="1" stopColor={hairDark} />
        </linearGradient>
        <filter id={id('b1')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id={id('b2')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation=".45" />
        </filter>
        <pattern id={id('stubble')} width="1.7" height="1.7" patternUnits="userSpaceOnUse">
          <circle cx=".4" cy=".5" r=".26" fill={hairHex} />
          <circle cx="1.25" cy="1.2" r=".24" fill={hairHex} />
        </pattern>
        <clipPath id={id('clip')}>
          <circle cx="50" cy="50" r="49" />
        </clipPath>
        <clipPath id={id('face')}>
          <path d={face} />
        </clipPath>
      </defs>

      <g clipPath={framed ? url('clip') : undefined}>
        {framed && <rect width="100" height="100" fill={url('bg')} />}
        {framed && <circle cx="50" cy="40" r="40" fill="#10b981" opacity=".08" />}

        <HairBack style={look.hair} fill={url('hair')} />

        {/* neck (in shadow under the jaw) and shirt */}
        <path d="M40.5 64h19v20c-3 5.500-16 5.500-19 0z" fill={url('neck')} />
        <path d="M5 106c1-15 16-23 35-25 5 7 15 7 20 0 19 2 34 10 35 25z" fill={url('kit')} />
        <path d="M5 106c1-15 16-23 35-25 5 7 15 7 20 0 19 2 34 10 35 25z" fill="#000" opacity=".12" />
        <path d="M38.500 80.500c3.500 8 19.500 8 23 0" fill="none" stroke="#f2c14e" strokeWidth="2.400" strokeLinecap="round" />

        {/* ears */}
        {[26.500, 73.500].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={50} rx={4.300} ry={6} fill={skin} />
            <path d={i === 0 ? 'M27.500 46c-3 1-3.500 7 0 9' : 'M72.500 46c3 1 3.500 7 0 9'} fill="none" stroke={skinDeep} strokeWidth=".7" opacity=".55" strokeLinecap="round" />
          </g>
        ))}

        {/* the face, modelled with light and shade */}
        <path d={face} fill={url('skin')} />
        <g clipPath={url('face')}>
          <rect x="20" y="10" width="60" height="78" fill={url('edge')} />
          <ellipse cx="36" cy="58" rx="9" ry="7" fill={url('blush')} />
          <ellipse cx="64" cy="58" rx="9" ry="7" fill={url('blush')} />
          <ellipse cx="50" cy="26" rx="14" ry="6" fill="#fff" opacity=".11" filter={url('b1')} />
          <ellipse cx="50" cy="80" rx="12" ry="5" fill={skinDeep} opacity=".2" filter={url('b1')} />
          <path d="M28 52C28 66 34 78 44 82C34 76 30 64 28 52z" fill={skinDeep} opacity=".18" />
        </g>

        {/* brows */}
        {[false, true].map((m) => {
          const x = (v: number) => (m ? 100 - v : v);
          return <path key={String(m)} d={`M${x(32.5)} 42.500C${x(36)} 39.200 ${x(41.500)} 38.800 ${x(46)} 40.800C${x(41.800)} 40.300 ${x(37)} 41.300 ${x(33.300)} 44Z`} fill={brow} opacity=".92" />;
        })}

        {eye(39.5, false)}
        {eye(60.5, true)}

        {/* nose */}
        <path d="M47.500 46C47 54 45.500 59 44 62.500C46 65 54 65 56 62.500C54.500 59 53 54 52.500 46Z" fill={url('nose')} filter={url('b1')} />
        <ellipse cx="50" cy="60.500" rx="2.600" ry="1.800" fill="#fff" opacity=".2" />
        <path d="M44.800 61.800C43.600 63.400 44.800 65 47 64.800M55.200 61.800C56.400 63.400 55.200 65 53 64.800" fill="none" stroke={skinDeep} strokeWidth=".6" opacity=".55" strokeLinecap="round" />
        <ellipse cx="47.200" cy="64" rx="1.500" ry=".9" fill="#1a0c08" opacity=".55" />
        <ellipse cx="52.800" cy="64" rx="1.500" ry=".9" fill="#1a0c08" opacity=".55" />
        <path d="M49 66.500C49 68 48.800 68.500 48.500 69M51 66.500C51 68 51.200 68.500 51.500 69" fill="none" stroke={skinDeep} strokeWidth=".4" opacity=".3" />

        {/* beard under the lips so they stay readable */}
        {look.beard === 'stubble' && (
          <g clipPath={url('face')}>
            <path d="M27 50C28 66 36 80 50 84C64 80 72 66 73 50C70 62 62 68 50 68S30 62 27 50z" fill={url('stubble')} opacity=".6" filter={url('b2')} />
            <path d="M42 66C46 64 54 64 58 66C56 68.500 44 68.500 42 66z" fill={url('stubble')} opacity=".55" />
          </g>
        )}
        {look.beard === 'short' && (
          <g clipPath={url('face')}>
            <path d="M26 51C27 70 36 84 50 85C64 84 73 70 74 51C71 63 62 68 50 68S29 63 26 51z" fill={url('hair')} opacity=".95" filter={url('b1')} />
            <g stroke={hairDark} strokeWidth=".4" fill="none" opacity=".35">
              <path d="M32 66C36 74 42 79 48 81M68 66C64 74 58 79 52 81M40 70C43 75 47 78 50 79" />
            </g>
          </g>
        )}
        {look.beard === 'full' && (
          <g>
            <path d="M25 49C24 72 36 87 50 88C64 87 76 72 75 49C72 63 62 67 50 67S28 63 25 49z" fill={url('hair')} filter={url('b2')} />
            <g stroke={hairDark} strokeWidth=".45" fill="none" opacity=".4">
              <path d="M30 62C33 74 40 82 47 85M70 62C67 74 60 82 53 85M38 70C41 77 46 82 50 84M62 70C59 77 54 82 50 84" />
            </g>
          </g>
        )}

        {/* mouth: shaded lips, a quiet smile */}
        <path d="M42.500 71.200C45 69.200 48 69.400 50 70.300C52 69.400 55 69.200 57.500 71.200C55 72.200 52.500 72.400 50 72.100C47.500 72.400 45 72.200 42.500 71.200Z" fill={lip} />
        <path d="M43.500 71.800C46 75 54 75 56.500 71.800C54 73 46 73 43.500 71.800Z" fill={lipLo} />
        <path d="M42 71.300C46 72.800 54 72.800 58 71.300" fill="none" stroke="#2a1210" strokeWidth=".6" opacity=".55" strokeLinecap="round" />
        <ellipse cx="50" cy="77" rx="3.600" ry="1.300" fill="#fff" opacity=".1" />

        {look.beard === 'full' && <path d="M39 68.500C43 66.200 57 66.200 61 68.500C58 70 54 69.800 50 69.700C46 69.800 42 70 39 68.500Z" fill={url('hair')} />}

        <HairFront style={look.hair} fill={url('hair')} dark={hairDark} light={hairLight} />
      </g>
      {framed && <circle cx="50" cy="50" r="48.500" fill="none" stroke="#f2c14e" strokeOpacity=".5" strokeWidth="1.600" />}
      {hasBeard && null}
    </svg>
  );
}
