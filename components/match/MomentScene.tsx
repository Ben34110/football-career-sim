import { useId } from 'react';
import { HeadAvatar, shade, type Expression } from '@/components/ui/HeadAvatar';
import { DEFAULT_LOOK, SKINS, type Look } from '@/lib/data/look';
import type { Pose } from '@/lib/data/newspaper';

type P = [number, number];
type ArmPts = [P, P, P];

/** Head tilt (degrees) that goes with each pose */
const TILT: Record<Pose, number> = { trophy: 0, ball: 4, arms: -6, fist: 4, point: -3, shrug: 8, headhands: 0, facepalm: 8, crossed: -3, idle: 0 };

const mirror = (a: ArmPts): ArmPts => a.map(([x, y]) => [200 - x, y] as P) as ArmPts;

/** Where the arms go for each pose (left arm; the right one is mirrored unless given) */
const ARMS: Record<Pose, { left?: ArmPts; right?: ArmPts }> = {
  trophy: { left: [[66, 116], [42, 88], [73, 47]], right: mirror([[66, 116], [42, 88], [73, 47]]) },
  ball: { left: [[66, 116], [38, 92], [30, 54]], right: [[134, 116], [158, 92], [158, 58]] },
  arms: { left: [[66, 116], [38, 92], [30, 54]], right: mirror([[66, 116], [38, 92], [30, 54]]) },
  fist: { right: [[134, 116], [158, 102], [150, 70]] },
  point: { right: [[134, 116], [156, 96], [150, 64]] },
  shrug: { left: [[66, 116], [40, 132], [26, 114]], right: mirror([[66, 116], [40, 132], [26, 114]]) },
  headhands: { left: [[66, 116], [30, 98], [54, 66]], right: mirror([[66, 116], [30, 98], [54, 66]]) },
  facepalm: { right: [[134, 116], [152, 94], [116, 82]] },
  crossed: { left: [[66, 116], [88, 138], [138, 130]], right: [[134, 116], [112, 138], [62, 130]] },
  idle: {},
};

let seedBase = 11;
const rng = (seed: number) => {
  let s = seed + seedBase;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

function Limb({ pts, sleeve, skin, outline }: { pts: ArmPts; sleeve: string; skin: string; outline: string }) {
  const [s, e, w] = pts;
  return (
    <g strokeLinecap="round" fill="none">
      <line x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke={shade(sleeve, -0.45)} strokeWidth="17" />
      <line x1={e[0]} y1={e[1]} x2={w[0]} y2={w[1]} stroke={outline} strokeWidth="12.5" />
      <line x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke={sleeve} strokeWidth="15" />
      <line x1={e[0]} y1={e[1]} x2={w[0]} y2={w[1]} stroke={skin} strokeWidth="10.5" />
      <circle cx={w[0]} cy={w[1]} r="7" fill={skin} stroke={outline} strokeWidth=".9" />
    </g>
  );
}

function Confetti({ kit }: { kit: string }) {
  const r = rng(3);
  const colours = [kit, '#fbbf24', '#f4f4f5', '#ef4444', '#38bdf8', '#a3e635'];
  return (
    <g>
      {Array.from({ length: 30 }, (_, i) => {
        const x = r() * 200;
        const y = r() * 120;
        return <rect key={i} x={x} y={y} width="3" height="6" fill={colours[i % colours.length]} opacity=".9" transform={`rotate(${Math.round(r() * 180)} ${x} ${y})`} />;
      })}
    </g>
  );
}

function Rays() {
  return (
    <g fill="#fff" opacity=".13">
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const b = a + 0.1;
        return <polygon key={i} points={`100,92 ${100 + 150 * Math.cos(a)},${92 + 150 * Math.sin(a)} ${100 + 150 * Math.cos(b)},${92 + 150 * Math.sin(b)}`} />;
      })}
    </g>
  );
}

function Rain() {
  const r = rng(9);
  return (
    <g stroke="#fff" strokeWidth=".8" opacity=".25" strokeLinecap="round">
      {Array.from({ length: 24 }, (_, i) => {
        const x = r() * 210;
        const y = r() * 150;
        return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 11} />;
      })}
    </g>
  );
}

function Trophy() {
  return (
    <g transform="translate(100 21) scale(1.2)">
      <path d="M-12 -12C-22 -12 -22 2 -11 3M12 -12C22 -12 22 2 11 3" fill="none" stroke="#d99a1a" strokeWidth="3" strokeLinecap="round" />
      <path d="M-12 -15H12V-3C12 8 6 11 0 11C-6 11 -12 8 -12 -3Z" fill="#fbbf24" stroke="#b97708" strokeWidth=".8" />
      <rect x="-2.500" y="11" width="5" height="7" fill="#e5a419" />
      <rect x="-9" y="17" width="18" height="5" rx="1.500" fill="#b97708" />
      <path d="M-7 -11C-8 -4 -6 3 -3 6" stroke="#fff" strokeWidth="1.600" fill="none" opacity=".7" strokeLinecap="round" />
    </g>
  );
}

function MatchBall() {
  return (
    <g transform="translate(158 44)">
      <circle r="14" fill="#f8f8f6" stroke="#27272a" strokeWidth="1.200" />
      <polygon points="0,-6 5.700,-1.800 3.500,4.900 -3.500,4.900 -5.700,-1.800" fill="#27272a" />
      <path d="M0 -6L0 -14M5.700 -1.800L13 -4.500M3.500 4.900L8 11.500M-3.500 4.900L-8 11.500M-5.700 -1.800L-13 -4.500" stroke="#27272a" strokeWidth="1" />
    </g>
  );
}

/** The player in the middle of a moment: body language, tilt and a little staging. */
export function MomentScene({ look = DEFAULT_LOOK, kit = '#0f9d6c', pose, expression, height = 178 }: { look?: Look; kit?: string; pose: Pose; expression: Expression; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const skin = SKINS[look.skin] ?? SKINS[2];
  const outline = shade(skin, -0.42);
  const arms = ARMS[pose];
  const tilt = TILT[pose];
  const celebrating = pose === 'arms' || pose === 'ball' || pose === 'trophy';

  return (
    <svg viewBox="0 0 200 170" height={height} width={(height * 200) / 170} role="img" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`torso${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(kit, -0.3)} />
          <stop offset="1" stopColor={shade(kit, -0.55)} />
        </linearGradient>
      </defs>

      {(celebrating || pose === 'fist' || pose === 'point') && <Rays />}
      {pose === 'facepalm' && <Rain />}
      {celebrating && <Confetti kit={kit} />}

      {/* shoulders and chest */}
      <path d="M66 104L134 104L141 126L152 170L48 170L59 126Z" fill={`url(#torso${uid})`} />

      {/* the head, tilted from the neck */}
      <g transform={`rotate(${tilt} 100 112)`}>
        <g transform="translate(55 38)">
          <HeadAvatar look={look} kit={kit} expression={expression} size={90} />
        </g>
      </g>

      {arms.left && <Limb pts={arms.left} sleeve={kit} skin={skin} outline={outline} />}
      {arms.right && <Limb pts={arms.right} sleeve={kit} skin={skin} outline={outline} />}

      {/* props and effects */}
      {pose === 'trophy' && <Trophy />}
      {pose === 'ball' && <MatchBall />}
      {pose === 'point' && (
        <g>
          <line x1="150" y1="60" x2="150" y2="42" stroke={outline} strokeWidth="6.500" strokeLinecap="round" />
          <line x1="150" y1="60" x2="150" y2="42" stroke={skin} strokeWidth="4.500" strokeLinecap="round" />
          <path d="M162 34L164 28L166 34L172 36L166 38L164 44L162 38L156 36Z" fill="#fde68a" />
        </g>
      )}
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
        <g transform="translate(140 52)" stroke="#ef4444" strokeWidth="2.600" strokeLinecap="round" fill="none">
          <path d="M-7 -2Q-2 -2 -2 -7M7 -2Q2 -2 2 -7M-7 2Q-2 2 -2 7M7 2Q2 2 2 7" />
        </g>
      )}
    </svg>
  );
}
