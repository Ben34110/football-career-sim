/** Full-screen effects for the trophy ceremonies: all of them animate by themselves (SMIL), no JavaScript per frame. */

const W = 430;
const H = 900;

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

export function Stars() {
  const r = rng(11);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 70 }, (_, i) => {
        const x = r() * W;
        const y = r() * H * 0.5;
        const size = 0.6 + r() * 1.4;
        return (
          <circle key={i} cx={x} cy={y} r={size} fill="#fff" opacity=".7">
            <animate attributeName="opacity" values=".15;.9;.15" dur={`${2 + r() * 3}s`} begin={`${r() * 3}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}

/** Stadium floodlight beams sweeping across the sky. */
export function Beams({ color }: { color: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="beam-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".5" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="beam-blur" x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {[
        { x: 40, from: -16, to: 10, dur: 6.5 },
        { x: 390, from: 16, to: -10, dur: 7.5 },
        { x: 215, from: -6, to: 8, dur: 8.5 },
      ].map((b, i) => (
        <g key={i} filter="url(#beam-blur)" opacity=".55">
          <polygon points={`${b.x - 6},-20 ${b.x + 6},-20 ${b.x + 90},640 ${b.x - 90},640`} fill="url(#beam-fade)">
            <animateTransform attributeName="transform" type="rotate" values={`${b.from} ${b.x} -20;${b.to} ${b.x} -20;${b.from} ${b.x} -20`} dur={`${b.dur}s`} repeatCount="indefinite" />
          </polygon>
        </g>
      ))}
    </svg>
  );
}

/** Paper confetti falling from the top, forever. */
export function ConfettiRain({ colors }: { colors: string[] }) {
  const r = rng(5);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {[0, 1, 2].map((layer) => (
        <g key={layer}>
          <animateTransform attributeName="transform" type="translate" values={`0 -${H * 0.6};0 ${H * 0.55}`} dur={`${4.2 + layer * 1.3}s`} repeatCount="indefinite" />
          {Array.from({ length: 30 }, (_, i) => {
            const x = r() * W;
            const y = r() * H * 0.9;
            return <rect key={i} x={x} y={y} width="4.6" height="9" rx="1" fill={colors[(i + layer) % colors.length]} opacity=".95" transform={`rotate(${Math.round(r() * 180)} ${x} ${y})`} />;
          })}
        </g>
      ))}
    </svg>
  );
}

/** Firework bursts in the sky (each one repeats every few seconds). */
export function Fireworks({ colors }: { colors: string[] }) {
  const bursts = [
    { x: 90, y: 150, delay: 0 },
    { x: 340, y: 110, delay: 0.7 },
    { x: 215, y: 230, delay: 1.5 },
    { x: 60, y: 300, delay: 2.1 },
    { x: 370, y: 280, delay: 2.7 },
  ];
  const N = 22;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {bursts.map((b, bi) => {
        const color = colors[bi % colors.length];
        return (
          <g key={bi}>
            {Array.from({ length: N }, (_, i) => {
              const a = (i / N) * Math.PI * 2;
              const R = i % 2 ? 62 : 44;
              return (
                <circle key={i} cx={b.x} cy={b.y} r={i % 2 ? 2 : 2.8} fill={color} opacity="0">
                  <animateMotion path={`M0,0 L${(Math.cos(a) * R).toFixed(1)},${(Math.sin(a) * R).toFixed(1)}`} dur="1.4s" begin={`${b.delay}s`} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.1 0.7 0.3 1" fill="freeze" />
                  <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.08;0.5;1;1" dur="1.4s" begin={`${b.delay}s`} repeatCount="indefinite" />
                </circle>
              );
            })}
            {/* the flash at the heart of the burst */}
            <circle cx={b.x} cy={b.y} r="5" fill="#fff" opacity="0">
              <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.1;0.4" dur="1.4s" begin={`${b.delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="2;14;4" keyTimes="0;0.15;0.6" dur="1.4s" begin={`${b.delay}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

/** Photographers' flashes popping all over the stands (Ballon d'Or). */
export function CameraFlashes() {
  const r = rng(21);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => {
        const cx = r() * W;
        const cy = H * (0.3 + r() * 0.35);
        const dur = `${(1.6 + r() * 2).toFixed(2)}s`;
        const begin = `${(r() * 3).toFixed(2)}s`;
        return (
          <circle key={i} cx={cx} cy={cy} r="3" fill="#fff" opacity="0">
            <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.04;0.14;1" dur={dur} begin={begin} repeatCount="indefinite" />
            <animate attributeName="r" values="1;11;2;1" keyTimes="0;0.04;0.14;1" dur={dur} begin={begin} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}
