"use client";

import { shade } from "./shared";

/* ───────────────────────── the shooter, seen from the front ───────────────────────── */

/**
 * He faces you. His head, his shoulders and his standing foot lean where he will shoot;
 * `kick` winds the other leg back (−1) and swings it through (+1).
 */
export function FrontPlayer({
  x,
  y,
  s,
  kit,
  skin,
  hair,
  lean,
  kick,
  arms,
  stride,
}: {
  x: number;
  y: number;
  s: number;
  kit: string;
  skin: string;
  hair: string;
  lean: number;
  kick: number;
  arms: "balance" | "up" | "head";
  stride?: number;
}) {
  const dark = shade(kit, -0.35);
  const back = Math.max(0, -kick);
  const fwd = Math.max(0, kick);
  // `stride` runs him: the legs swing in turn and the arms pump
  const sw = stride === undefined ? 0 : Math.sin(stride);
  const kickFoot: [number, number] = [
    -6 - back * 6 + fwd * 9,
    -back * 13 - fwd * 3 - Math.max(0, sw) * 8,
  ];
  const plantFoot: [number, number] = [7 + lean * 8, -Math.max(0, -sw) * 8];
  const hipL: [number, number] = [-4.5, -24];
  const hipR: [number, number] = [4.5, -24];
  const kneeL: [number, number] = [
    (hipL[0] + kickFoot[0]) / 2 - 1.5,
    -13 + kickFoot[1] * 0.35,
  ];
  const kneeR: [number, number] = [(hipR[0] + plantFoot[0]) / 2 + 1, -12.5];
  const leg = (
    hip: [number, number],
    knee: [number, number],
    foot: [number, number],
  ) => (
    <g strokeLinecap="round" fill="none">
      <path
        d={`M${hip[0]} ${hip[1]}L${knee[0].toFixed(1)} ${knee[1].toFixed(1)}`}
        stroke={skin}
        strokeWidth="5.4"
      />
      <path
        d={`M${knee[0].toFixed(1)} ${knee[1].toFixed(1)}L${foot[0].toFixed(1)} ${foot[1].toFixed(1)}`}
        stroke={kit}
        strokeWidth="5"
      />
      <ellipse cx={foot[0]} cy={foot[1] + 1} rx="4.6" ry="2.6" fill="#0b0b0f" />
    </g>
  );
  const hand = (side: -1 | 1): [number, number] => {
    if (arms === "up") return [side * 17, -68];
    if (arms === "head") return [side * 5.5, -60];
    // arms out for balance; the far one rises when he leans
    return [side * 21, -35 - side * lean * 5 + side * sw * 5];
  };
  const arm = (side: -1 | 1) => {
    const h = hand(side);
    const el: [number, number] = [
      side * (arms === "balance" ? 17 : arms === "up" ? 15 : 14),
      arms === "balance" ? -39 : arms === "up" ? -55 : -50,
    ];
    return (
      <path
        d={`M${side * 10.5} -44L${el[0]} ${el[1]}L${h[0].toFixed(1)} ${h[1].toFixed(1)}`}
        stroke={skin}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="16" ry="3.4" fill="#000" opacity=".3" />
      {leg(hipL, kneeL, kickFoot)}
      {leg(hipR, kneeR, plantFoot)}
      {kick > 0.2 && (
        <path
          d={`M${kickFoot[0] - 9} ${kickFoot[1] - 6}Q${kickFoot[0] - 2} ${kickFoot[1] - 12} ${kickFoot[0] + 8} ${kickFoot[1] - 6}`}
          stroke="#fff"
          strokeWidth="1.2"
          fill="none"
          opacity=".55"
        />
      )}
      <g transform={`rotate(${lean * 7} 0 -24)`}>
        <rect x="-9.5" y="-29" width="19" height="9" rx="3" fill="#f4f4f5" />
        {arm(-1)}
        {arm(1)}
        <path
          d="M-11.500 -45Q0 -49 11.500 -45L9.500 -26H-9.500Z"
          fill={kit}
          stroke={dark}
          strokeWidth=".8"
        />
        <path
          d="M-3 -46.500Q0 -43 3 -46.500"
          stroke={dark}
          strokeWidth="1"
          fill="none"
        />
        <rect x="-2" y="-50" width="4" height="5" rx="1.500" fill={skin} />
        <g transform={`translate(${lean * 2.2} 0)`}>
          <circle cx="0" cy="-55.500" r="7" fill={skin} />
          <path
            d="M-7.200 -56C-7 -64 7 -64 7.200 -56C5 -59.500 -5 -59.500 -7.200 -56Z"
            fill={hair}
          />
          <ellipse cx="-2.800" cy="-55.200" rx="1.900" ry="1.500" fill="#fff" />
          <ellipse cx="2.800" cy="-55.200" rx="1.900" ry="1.500" fill="#fff" />
          <circle cx={-2.8 + lean * 1.1} cy="-55.200" r=".95" fill="#111827" />
          <circle cx={2.8 + lean * 1.1} cy="-55.200" r=".95" fill="#111827" />
          <path
            d={
              arms === "up"
                ? "M-2.500 -51.500Q0 -48.500 2.500 -51.500Z"
                : arms === "head"
                  ? "M-2.200 -50.500Q0 -52 2.200 -50.500"
                  : "M-2 -51Q0 -50.200 2 -51"
            }
            stroke="#7c2d12"
            strokeWidth=".9"
            fill={arms === "up" ? "#7c2d12" : "none"}
          />
        </g>
      </g>
    </g>
  );
}

/* ───────────────────────── you, seen from behind ───────────────────────── */

/** You, in front of the camera: knees bent, arms wide. `stretch` throws you towards `dir`. */
export function BackPlayer({
  x,
  y,
  s,
  kit,
  skin,
  hair,
  step,
  tilt,
  stretch,
  dir,
  run = 1,
}: {
  x: number;
  y: number;
  s: number;
  kit: string;
  skin: string;
  hair: string;
  step: number;
  tilt: number;
  stretch: number;
  dir: number;
  run?: number;
}) {
  const dark = shade(kit, -0.35);
  const sw = Math.sin(step);
  const footL: [number, number] = [
    -10 - sw * 3 * run,
    -Math.max(0, sw) * 3 * run,
  ];
  const footR: [number, number] = [
    10 - sw * 3 * run,
    -Math.max(0, -sw) * 3 * run,
  ];
  const bob = run > 1 ? Math.abs(sw) * 1.6 * run : 0;
  const leg = (hipX: number, foot: [number, number]) => {
    const knee: [number, number] = [
      hipX + (foot[0] - hipX) * 0.45 + Math.sign(hipX) * 2.5,
      -12.5,
    ];
    return (
      <g strokeLinecap="round" fill="none">
        <path
          d={`M${hipX} -23L${knee[0].toFixed(1)} ${knee[1]}`}
          stroke={skin}
          strokeWidth="6"
        />
        <path
          d={`M${knee[0].toFixed(1)} ${knee[1]}L${foot[0].toFixed(1)} ${foot[1].toFixed(1)}`}
          stroke={kit}
          strokeWidth="5.600"
        />
        <ellipse
          cx={foot[0]}
          cy={foot[1] + 1}
          rx="5.200"
          ry="2.800"
          fill="#0b0b0f"
        />
      </g>
    );
  };
  const side = Math.sign(dir) || 1;
  const arm = (a: -1 | 1) => {
    const reaching = stretch > 0.01 && a === side;
    const hand: [number, number] = reaching
      ? [a * (22 + stretch * 10), -38 - stretch * 34]
      : [a * 22, -33 + (stretch > 0.01 ? stretch * 6 : 0)];
    const el: [number, number] = reaching
      ? [a * (19 + stretch * 4), -44 - stretch * 10]
      : [a * 18, -40];
    return (
      <g>
        <path
          d={`M${a * 11} -45L${el[0]} ${el[1]}L${hand[0].toFixed(1)} ${hand[1].toFixed(1)}`}
          stroke={skin}
          strokeWidth="4.400"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx={hand[0]} cy={hand[1]} r="3" fill={skin} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="19" ry="4" fill="#000" opacity=".32" />
      <g transform={`translate(0 ${-bob})`}>
        {leg(-5, footL)}
        {leg(5, footR)}
        <rect
          x="-10.500"
          y="-30"
          width="21"
          height="10"
          rx="3.500"
          fill="#f4f4f5"
        />
        {arm(-1)}
        {arm(1)}
        <path
          d="M-12.500 -46Q0 -50 12.500 -46L10 -27H-10Z"
          fill={kit}
          stroke={dark}
          strokeWidth=".9"
        />
        <path d="M0 -47V-27" stroke={dark} strokeWidth=".7" opacity=".4" />
        <text
          x="0"
          y="-33"
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          fill="#fff"
          opacity=".92"
          fontFamily="sans-serif"
        >
          10
        </text>
        <rect x="-2.500" y="-51" width="5" height="6" rx="2" fill={skin} />
        <circle cx="-7.300" cy="-56.500" r="1.800" fill={skin} />
        <circle cx="7.300" cy="-56.500" r="1.800" fill={skin} />
        <circle cx="0" cy="-57" r="7.400" fill={skin} />
        <path
          d="M-7.600 -56C-7.800 -66 7.800 -66 7.600 -56C7 -52 5 -51 0 -51C-5 -51 -7 -52 -7.600 -56Z"
          fill={hair}
        />
      </g>
    </g>
  );
}
