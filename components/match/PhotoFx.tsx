import type { Pose } from '@/lib/data/newspaper';

const W = 340;
const H = 178;

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

const CELEBRATING: Pose[] = ['arms', 'ball', 'trophy'];

/** Light beams, confetti or rain over the whole photo (edge to edge, never a visible box). */
export function PhotoFx({ pose, kit = '#10b981' }: { pose: Pose; kit?: string }) {
  const celebrating = CELEBRATING.includes(pose);
  const beams = celebrating || pose === 'fist' || pose === 'point';
  const r = rng(5);
  const colours = [kit, '#fbbf24', '#f4f4f5', '#ef4444', '#38bdf8', '#a3e635'];
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {beams && (
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 170 105" to="360 170 105" dur="42s" repeatCount="indefinite" />
          <g fill="#fff" opacity=".13">
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              const b = a + 0.13;
              return <polygon key={i} points={`170,105 ${170 + 520 * Math.cos(a)},${105 + 520 * Math.sin(a)} ${170 + 520 * Math.cos(b)},${105 + 520 * Math.sin(b)}`} />;
            })}
          </g>
        </g>
      )}
      {celebrating &&
        [0, 1, 2].map((layer) => (
          <g key={layer}>
            <animateTransform attributeName="transform" type="translate" values={`0 ${-40 + layer * 6};0 ${H + layer * 10}`} dur={`${3.2 + layer * 0.8}s`} repeatCount="indefinite" />
            {Array.from({ length: 16 }, (_, i) => {
              const x = r() * W;
              const y = r() * (H * 0.9);
              return <rect key={i} x={x} y={y} width="3.6" height="7" rx=".9" fill={colours[(i + layer) % colours.length]} opacity=".92" transform={`rotate(${Math.round(r() * 180)} ${x} ${y})`} />;
            })}
          </g>
        ))}
      {pose === 'facepalm' && (
        <g stroke="#fff" strokeWidth=".9" opacity=".28" strokeLinecap="round">
          <animateTransform attributeName="transform" type="translate" values="0 -16;-6 24" dur="0.9s" repeatCount="indefinite" />
          {Array.from({ length: 40 }, (_, i) => {
            const x = r() * (W + 30);
            const y = r() * H;
            return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 11} />;
          })}
        </g>
      )}
    </svg>
  );
}
