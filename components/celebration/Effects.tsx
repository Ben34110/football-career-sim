/**
 * Full-screen effects for the trophy ceremonies, built to stay at 60 fps on a phone: every moving part is a
 * layer of its own that only gets a CSS transform / opacity animation (see globals.css, `fx-*`). The drawing of a layer
 * is rasterised once and then moved by the compositor; nothing is repainted per frame, there is no blur and no JavaScript.
 */

const W = 430;
const H = 900;

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

const layer = 'pointer-events-none absolute inset-0 h-full w-full';

/** A still sky of stars; a second layer of a few of them twinkles as a whole. */
export function Stars() {
  const r = rng(11);
  const dots = Array.from({ length: 44 }, () => ({ x: r() * W, y: r() * H * 0.5, s: 0.6 + r() * 1.4 }));
  const still = dots.filter((_, i) => i % 4 !== 0);
  const twinkle = dots.filter((_, i) => i % 4 === 0);
  return (
    <>
      <svg className={layer} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        {still.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.s} fill="#fff" opacity=".55" />
        ))}
      </svg>
      {[0, 1].map((k) => (
        <svg key={k} className={`${layer} fx-twinkle`} style={{ animationDelay: `${k * 1.3}s`, animationDuration: `${2.6 + k}s` }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          {twinkle.filter((_, i) => i % 2 === k).map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.s} fill="#fff" />
          ))}
        </svg>
      ))}
    </>
  );
}

/** Stadium floodlight beams sweeping across the sky: three gradient shapes that only rotate. */
export function Beams({ color }: { color: string }) {
  return (
    <>
      {[
        { x: 9, from: -16, to: 10, dur: 6.5 },
        { x: 91, from: 16, to: -10, dur: 7.5 },
        { x: 50, from: -6, to: 8, dur: 8.5 },
      ].map((b, i) => (
        <div
          key={i}
          className="fx-sway pointer-events-none absolute"
          style={
            {
              left: `${b.x}%`,
              top: '-3%',
              width: '44%',
              height: '75%',
              marginLeft: '-22%',
              transformOrigin: '50% 0',
              background: `linear-gradient(to bottom, ${color}70, ${color}00)`,
              clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)',
              animationDuration: `${b.dur}s`,
              '--from': `${b.from}deg`,
              '--to': `${b.to}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/** Paper confetti falling from the top, forever: three layers, each one moved as a whole. */
export function ConfettiRain({ colors }: { colors: string[] }) {
  const r = rng(5);
  return (
    <>
      {[0, 1, 2].map((layerIndex) => (
        <svg key={layerIndex} className={`${layer} fx-confetti`} style={{ animationDuration: `${4.2 + layerIndex * 1.3}s` }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 18 }, (_, i) => {
            const x = r() * W;
            const y = r() * H * 0.9;
            return <rect key={i} x={x} y={y} width="4.6" height="9" rx="1" fill={colors[(i + layerIndex) % colors.length]} opacity=".95" transform={`rotate(${Math.round(r() * 180)} ${x} ${y})`} />;
          })}
        </svg>
      ))}
    </>
  );
}

/** Firework bursts: each one is a small drawing that grows from its centre and fades (CSS scale + opacity). */
export function Fireworks({ colors }: { colors: string[] }) {
  const bursts = [
    { x: 90, y: 150, delay: 0 },
    { x: 340, y: 110, delay: 0.9 },
    { x: 215, y: 240, delay: 1.7 },
    { x: 365, y: 290, delay: 2.4 },
  ];
  const N = 14;
  return (
    <>
      {bursts.map((b, bi) => {
        const color = colors[bi % colors.length];
        return (
          <svg
            key={bi}
            className="fx-burst pointer-events-none absolute"
            style={{ left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: 150, height: 150, marginLeft: -75, marginTop: -75, animationDelay: `${b.delay}s` }}
            viewBox="-75 -75 150 150"
            aria-hidden
          >
            {Array.from({ length: N }, (_, i) => {
              const a = (i / N) * Math.PI * 2;
              const R = i % 2 ? 62 : 44;
              return <circle key={i} cx={(Math.cos(a) * R).toFixed(1)} cy={(Math.sin(a) * R).toFixed(1)} r={i % 2 ? 2.4 : 3.2} fill={color} />;
            })}
            <circle r="6" fill="#fff" />
          </svg>
        );
      })}
    </>
  );
}

/** Photographers' flashes popping all over the stands (Golden Star): two layers of four flashes each. */
export function CameraFlashes() {
  const r = rng(21);
  const flashes = Array.from({ length: 8 }, () => ({ cx: r() * W, cy: H * (0.3 + r() * 0.35) }));
  return (
    <>
      {[0, 1].map((k) => (
        <svg key={k} className={`${layer} fx-flash`} style={{ animationDuration: `${2.2 + k * 0.9}s`, animationDelay: `${k * 0.8}s` }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          {flashes.filter((_, i) => i % 2 === k).map((f, i) => (
            <circle key={i} cx={f.cx} cy={f.cy} r="7" fill="#fff" />
          ))}
        </svg>
      ))}
    </>
  );
}
