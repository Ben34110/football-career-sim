import { crowdFor } from '@/lib/data/crowd';

/** A stand full of supporters, deliberately out of focus. */
export function Crowd({ kit = '#10b981', joy }: { kit?: string; joy: boolean }) {
  const W = 340;
  const H = 178;
  const fans = crowdFor(W, H, kit, joy);
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <filter id="np-crowd-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id="np-light-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {/* floodlights */}
      <g filter="url(#np-light-blur)" fill="#fff" opacity=".7">
        {[40, 120, 220, 300].map((x, i) => (
          <circle key={x} cx={x} cy={10 + (i % 2) * 8} r={13} />
        ))}
      </g>
      <g filter="url(#np-crowd-blur)">
        {fans.map((f, i) => (
          <g key={i}>
            {f.arms && <rect x={f.x - f.r * 1.15} y={f.y - f.r * 2.6} width={f.r * 0.55} height={f.r * 2.2} rx={f.r * 0.27} fill={f.skin} />}
            {f.arms && <rect x={f.x + f.r * 0.6} y={f.y - f.r * 2.6} width={f.r * 0.55} height={f.r * 2.2} rx={f.r * 0.27} fill={f.skin} />}
            <rect x={f.x - f.r * 1.25} y={f.y + f.r * 0.7} width={f.r * 2.5} height={f.r * 3} rx={f.r} fill={f.shirt} />
            <circle cx={f.x} cy={f.y} r={f.r} fill={f.skin} />
          </g>
        ))}
      </g>
      <rect width={W} height={H} fill="#000" opacity=".28" />
    </svg>
  );
}
