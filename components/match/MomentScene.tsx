import { useId } from 'react';
import { HeadAvatar, shade, type Expression } from '@/components/ui/HeadAvatar';
import { DEFAULT_LOOK, SKINS, type Look } from '@/lib/data/look';
import type { Pose } from '@/lib/data/newspaper';
import { TrophyArt, type TrophyKind } from '@/components/celebration/TrophyArt';

type V = [number, number];
type Hand = 'fist' | 'open' | 'point';
interface Arm {
  /** shoulder, elbow, wrist */
  pts: [V, V, V];
  hand: Hand;
}

/** Head tilt (degrees) that goes with each pose */
const TILT: Record<Pose, number> = { trophy: 0, ball: 4, arms: -6, fist: 4, point: -3, shrug: 8, headhands: 0, facepalm: 8, crossed: -3, idle: 0 };

const flip = (a: Arm): Arm => ({ ...a, pts: a.pts.map(([x, y]) => [200 - x, y] as V) as Arm['pts'] });
const both = (a: Arm): Arm[] => [a, flip(a)];

const ARMS: Record<Pose, Arm[]> = {
  trophy: both({ pts: [[66, 118], [38, 96], [84, 52]], hand: 'open' }),
  ball: [{ pts: [[66, 118], [40, 98], [32, 56]], hand: 'open' }, { pts: [[134, 118], [160, 98], [158, 62]], hand: 'open' }],
  arms: both({ pts: [[66, 118], [40, 98], [32, 56]], hand: 'open' }),
  fist: [{ pts: [[134, 118], [160, 104], [152, 72]], hand: 'open' }],
  point: [{ pts: [[134, 118], [158, 98], [150, 68]], hand: 'point' }],
  shrug: both({ pts: [[66, 118], [40, 134], [26, 114]], hand: 'open' }),
  headhands: both({ pts: [[66, 118], [32, 100], [56, 68]], hand: 'open' }),
  facepalm: [{ pts: [[134, 118], [156, 98], [124, 86]], hand: 'open' }],
  crossed: [{ pts: [[66, 118], [92, 142], [136, 130]], hand: 'fist' }, { pts: [[134, 118], [108, 142], [64, 130]], hand: 'fist' }],
  idle: [],
};

/* ───────── smooth limbs ───────── */

/** Catmull-Rom through the points, sampled evenly. */
function spline(pts: V[], per = 14): V[] {
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  const out: V[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p[i - 1][0], p[i][0], p[i + 1][0], p[i + 2][0]), f(p[i - 1][1], p[i][1], p[i + 1][1], p[i + 2][1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const fmt = (v: V) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;

/** One closed outline around a centre line whose width follows `w(t)`; round or flat ends. */
function ribbon(c: V[], w: (t: number) => number, t0 = 0, t1 = 1, roundEnd = true, grow = 0): string {
  const n = c.length - 1;
  const idx = c.map((_, i) => i).filter((i) => i / n >= t0 - 1e-6 && i / n <= t1 + 1e-6);
  const L: V[] = [];
  const R: V[] = [];
  for (const i of idx) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const half = (w(i / n) + grow) / 2;
    L.push([c[i][0] - dy * half, c[i][1] + dx * half]);
    R.push([c[i][0] + dy * half, c[i][1] - dx * half]);
  }
  const rs = (w(idx[0] / n) + grow) / 2;
  const re = (w(idx[idx.length - 1] / n) + grow) / 2;
  let d = `M${fmt(L[0])}`;
  for (let i = 1; i < L.length; i++) d += `L${fmt(L[i])}`;
  d += roundEnd ? `A${re.toFixed(1)} ${re.toFixed(1)} 0 0 0 ${fmt(R[R.length - 1])}` : `L${fmt(R[R.length - 1])}`;
  for (let i = R.length - 2; i >= 0; i--) d += `L${fmt(R[i])}`;
  d += `A${rs.toFixed(1)} ${rs.toFixed(1)} 0 0 0 ${fmt(L[0])}Z`;
  return d;
}

const width = (t: number) => (t < 0.5 ? 17 - 7 * t : 13.5 - 7 * (t - 0.5));

/* ───────── hands (drawn pointing along +x from the wrist) ───────── */

function HandShape({ kind, fill, line }: { kind: Hand; fill: string; line: string }) {
  const fist = 'M-1 -6.2C4 -8.4 11 -8 14.2 -4C16.6 -0.8 15.8 4.6 11.4 6.8C6.6 8.6 1.6 7.6 -1 6Z';
  if (kind === 'open') {
    // a real hand: palm, four fanned fingers (index to little finger) and a thumb
    const fingers: [number, number, number][] = [
      [-4.8, 9.5, -17],
      [-1.6, 12, -6],
      [1.6, 11.2, 6],
      [4.8, 8.4, 17],
    ];
    return (
      <g>
        {[true, false].map((outline) => (
          <g key={String(outline)} fill={outline ? line : fill} stroke={outline ? line : 'none'} strokeWidth={outline ? 2.2 : 0} strokeLinejoin="round">
            {fingers.map(([cy, len, rot], i) => (
              <rect key={i} x="9" y={cy - 1.7} width={len} height="3.4" rx="1.7" transform={`rotate(${rot} 9.500 ${cy})`} />
            ))}
            <rect x="-1.500" y="-7.600" width="9.500" height="3.600" rx="1.800" transform="rotate(-52 0 -5.800)" />
            <path d="M-1.500 -6.600C3 -7.600 8 -7.200 11 -6.600L11 6.600C8 7.200 3 7.600 -1.500 6.600Z" />
          </g>
        ))}
        <path d="M2 -3C4 -2 4.500 2 2.500 3.500" fill="none" stroke={line} strokeWidth=".6" opacity=".45" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      {[true, false].map((outline) => (
        <g key={String(outline)} fill={outline ? line : fill} stroke={outline ? line : 'none'} strokeWidth={outline ? 2.2 : 0} strokeLinejoin="round">
          {kind === 'point' && <rect x="9" y="-5.2" width="16" height="3.8" rx="1.9" />}
          <path d={fist} />
        </g>
      ))}
      <path d="M5.600 -7.200C6.800 -3 6.800 3 5.800 7.400M9.600 -7.500C10.800 -3 10.800 3 9.800 7" fill="none" stroke={line} strokeWidth=".7" opacity=".7" strokeLinecap="round" />
    </g>
  );
}

function Limb({ arm, skin, line, ids, clip }: { arm: Arm; skin: string; line: string; ids: { s: string; k: string; shade: string; out: string }; clip: boolean }) {
  const c = spline(arm.pts);
  const body = ribbon(c, width, 0, 1, true);
  const sleeve = ribbon(c, width, 0, 0.5, false, 3.4);
  const hem = ribbon(c, width, 0.43, 0.5, false, 3.8);
  const w = arm.pts[2];
  const e = arm.pts[1];
  const angle = (Math.atan2(w[1] - e[1], w[0] - e[0]) * 180) / Math.PI;
  return (
    <g>
      {/* one outline behind everything, so the arm reads as a single shape */}
      {/* the outline stops where the arm meets the body, so shoulder and chest are one piece */}
      <g fill={line} stroke={line} strokeWidth="2.200" strokeLinejoin="round" clipPath={clip ? `url(#${ids.out})` : undefined}>
        <path d={body} />
        <path d={sleeve} />
      </g>
      <g transform={`translate(${w[0]} ${w[1]}) rotate(${angle})`}>
        <HandShape kind={arm.hand} fill={skin} line={line} />
      </g>
      <path d={body} fill={`url(#${ids.s})`} />
      <path d={sleeve} fill={`url(#${ids.k})`} />
      <path d={hem} fill="#fff" opacity=".12" />
    </g>
  );
}

/* ───────── staging ───────── */

function MatchBall() {
  return (
    <g transform="translate(158 40)">
      <circle r="14.500" fill="#f8f8f6" stroke="#27272a" strokeWidth="1.200" />
      <polygon points="0,-6.500 6.200,-2 3.800,5.300 -3.800,5.300 -6.200,-2" fill="#27272a" />
      <path d="M0 -6.500V-14M6.200 -2L13.800 -4.500M3.800 5.300L8.500 12M-3.800 5.300L-8.500 12M-6.200 -2L-13.800 -4.500" stroke="#27272a" strokeWidth="1" />
      <path d="M-9 -8C-5 -12 1 -13.500 5 -12.500" stroke="#fff" strokeWidth="1.800" fill="none" opacity=".8" strokeLinecap="round" />
    </g>
  );
}

/** The player in the middle of a moment: body language, tilt and a little staging. */
/** The scene runs a little below the photo so the body never ends in view, even while it bobs. */
export const SCENE_BLEED = 20 / 170;

const TORSO = 'M46 190L52 140C53 126 57 114 66 108C74 104 84 103 90 102L110 102C116 103 126 104 134 108C143 114 147 126 148 140L154 190Z';

export function MomentScene({ look = DEFAULT_LOOK, kit = '#0f9d6c', pose, expression, height = 178, trophy = 'cup', accent, hideTrophy = false }: { look?: Look; kit?: string; pose: Pose; expression: Expression; height?: number; trophy?: TrophyKind; accent?: string; hideTrophy?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const skin = SKINS[look.skin] ?? SKINS[2];
  const line = shade(skin, -0.62);
  const kitLine = shade(kit, -0.62);
  const arms = ARMS[pose];
  const tilt = TILT[pose];
  const ids = { s: `skin${uid}`, k: `shirt${uid}`, g: `gold${uid}`, t: `shirt${uid}`, shade: `shade${uid}`, out: `out${uid}` };

  return (
    <svg viewBox="0 0 200 190" height={height * (190 / 170)} width={(height * 200) / 170} role="img" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={ids.s} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(skin, 0.1)} />
          <stop offset="1" stopColor={shade(skin, -0.22)} />
        </linearGradient>
        {/* one shirt gradient for chest and sleeves, so the shoulders blend into the body */}
        <linearGradient id={ids.k} gradientUnits="userSpaceOnUse" x1="0" y1="96" x2="0" y2="190">
          <stop offset="0" stopColor={shade(kit, -0.04)} />
          <stop offset="1" stopColor={shade(kit, -0.5)} />
        </linearGradient>
        <linearGradient id={ids.shade} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
        <clipPath id={ids.out}>
          <path clipRule="evenodd" d={`M-60 -60H260V260H-60Z ${TORSO}`} />
        </clipPath>
        <linearGradient id={ids.g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset=".5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d99a1a" />
        </linearGradient>
      </defs>

      {/* shoulders and body: one silhouette, long enough that it never ends in view */}
      <path d={TORSO} fill={kitLine} stroke={kitLine} strokeWidth="2.200" strokeLinejoin="round" />
      <path d={TORSO} fill={`url(#${ids.t})`} />
      <path d="M90 102C94 112 106 112 110 102" fill="none" stroke={shade(kit, -0.62)} strokeWidth=".8" opacity=".5" />

      {/* the head, tilted from the neck */}
      <g transform={`rotate(${tilt} 100 112)`}>
        <g transform="translate(55 38)">
          <HeadAvatar look={look} kit={kit} expression={expression} size={90} bare />
        </g>
      </g>

      {arms.map((a, i) => (
        <Limb key={i} arm={a} skin={skin} line={line} ids={ids} clip={pose !== 'crossed'} />
      ))}

      {/* props and effects */}
      {pose === 'trophy' && !hideTrophy && (
        <g transform="translate(100 25) scale(1.2)">
          <TrophyArt kind={trophy} accent={accent} />
        </g>
      )}
      {pose === 'ball' && <MatchBall />}
      {pose === 'point' && <path d="M163 30L165 24L167 30L173 32L167 34L165 40L163 34L157 32Z" fill="#fde68a" />}
      {pose === 'shrug' && (
        <text x="146" y="40" fontSize="30" fontWeight="800" fill="#fff" opacity=".55" fontFamily="Georgia, serif">
          ?
        </text>
      )}
      {pose === 'headhands' && (
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7">
          <line x1="86" y1="34" x2="82" y2="22" />
          <line x1="100" y1="32" x2="100" y2="18" />
          <line x1="114" y1="34" x2="118" y2="22" />
        </g>
      )}
      {pose === 'crossed' && (
        <g transform="translate(142 52)" stroke="#ef4444" strokeWidth="2.600" strokeLinecap="round" fill="none">
          <path d="M-7 -2Q-2 -2 -2 -7M7 -2Q2 -2 2 -7M-7 2Q-2 2 -2 7M7 2Q2 2 2 7" />
        </g>
      )}
    </svg>
  );
}
