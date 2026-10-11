import type { Look } from './look';
import { randomLook } from './look';
import type { RitualOption } from './rituals';

/**
 * The dressing room before kick-off. Four teammates, each in a mood that comes from the match ahead
 * (the opponent, the stakes, the last results). You can speak to one of them, with one approach:
 * the right words for the right mood move the group, the wrong ones fall flat.
 */
export type Mood = 'nervous' | 'cocky' | 'down' | 'wound' | 'calm';
export type Approach = 'reassure' | 'ground' | 'lift' | 'focus';
export type Role = 'captain' | 'kid' | 'keeper' | 'veteran' | 'striker' | 'playmaker';
export type Expr = 'neutral' | 'happy' | 'cheer' | 'sad' | 'angry' | 'shock';

export interface Mate {
  id: string;
  name: string;
  role: Role;
  mood: Mood;
  look: Look;
  /** What he mutters while you walk in */
  quote: string;
}

export interface RoomContext {
  /** Strength difference (mine − theirs) */
  diff: number;
  important: boolean;
  home: boolean;
  /** The last results, oldest first */
  recent: ('W' | 'D' | 'L')[];
  trust: number;
  surnames: readonly string[];
  /** Nationality code, for the faces */
  nation?: string;
  seed: string;
}

export const ROLE_LABEL: Record<Role, string> = { captain: 'Captain', kid: 'Youngster', keeper: 'Keeper', veteran: 'Veteran', striker: 'Striker', playmaker: 'Playmaker' };
/** How much a talk with him carries in the group */
const WEIGHT: Record<Role, number> = { captain: 1.4, striker: 1.2, playmaker: 1.2, veteran: 1.1, keeper: 1, kid: 0.8 };

export const MOOD_LABEL: Record<Mood, string> = { nervous: 'Nervous', cocky: 'Too confident', down: 'Down', wound: 'Wound up', calm: 'Relaxed' };
export const MOOD_FACE: Record<Mood, Expr> = { nervous: 'shock', cocky: 'cheer', down: 'sad', wound: 'angry', calm: 'neutral' };
export const APPROACHES: { id: Approach; label: string; hint: string; fixes: Mood }[] = [
  { id: 'reassure', label: 'Reassure', hint: 'Steady the nerves', fixes: 'nervous' },
  { id: 'ground', label: 'Bring him down', hint: 'Keep feet on the ground', fixes: 'cocky' },
  { id: 'lift', label: 'Lift him', hint: 'Give him back the spark', fixes: 'down' },
  { id: 'focus', label: 'Channel it', hint: 'Point the anger at the game', fixes: 'wound' },
];

const QUOTES: Record<Mood, string[]> = {
  nervous: [
    'Full house tonight… my legs feel heavy.',
    'I barely slept. What if I freeze?',
    'Did you see their forwards? We are in trouble.',
    'My hands are shaking, honestly.',
  ],
  cocky: [
    'Easy game. I will have a hat-trick by half-time.',
    'They should have stayed home, honestly.',
    'Relax, boss, we will walk this one.',
    'I could play this one with my eyes closed.',
  ],
  down: [
    'Still thinking about last week…',
    'Nothing is going our way lately.',
    'I am not sure I have it in me today.',
    'The heads are heavy in here.',
  ],
  wound: [
    'The ref robbed us last time. I am ready to explode.',
    'I swear, if somebody touches me today…',
    'Everybody is on my back. I am done with it.',
    'I want to hit something. Anything.',
  ],
  calm: ['All good. Just let me play.', 'Ready. Nothing more to say.', 'Breathing easy, boss.'],
};

/** What he says back once you have spoken. */
const WORKED: Record<Approach, string> = {
  reassure: 'He breathes out. “Thanks, I needed that.”',
  ground: 'He nods, jaw tight. “Fair. No lazy first half.”',
  lift: 'A spark in his eyes. “Let’s go and get it back.”',
  focus: 'He unclenches his fists. “I will save it for the pitch.”',
};
const MISSED: Record<Mood, string> = {
  nervous: 'That only made him more anxious.',
  cocky: 'He grins wider. Message not received.',
  down: 'He shrugs. You did not reach him.',
  wound: 'He snaps back. The tension is still there.',
  calm: 'He raises an eyebrow. He was fine.',
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** Same fixture, same dressing room. */
function seeded(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOODS: Mood[] = ['nervous', 'cocky', 'down', 'wound', 'calm'];

function moodScores(role: Role, c: RoomContext, rng: () => number): Record<Mood, number> {
  const last = c.recent[c.recent.length - 1];
  const losses = c.recent.filter((r) => r === 'L').length;
  const streak = c.recent.length >= 3 && c.recent.every((r) => r === 'W');
  return {
    nervous: (c.diff <= -4 ? 1.8 : c.diff <= -1 ? 0.6 : 0) + (c.important ? 1.2 : 0) + (c.home ? 0 : 0.5) + (role === 'kid' ? 1 : 0) + rng() * 1.2,
    cocky: (c.diff >= 4 ? 1.8 : c.diff >= 1 ? 0.5 : 0) + (c.home ? 0.4 : 0) + (streak ? 1.2 : 0) + (role === 'striker' || role === 'playmaker' ? 0.7 : 0) - (c.important ? 0.5 : 0) + rng() * 1.2,
    down: (last === 'L' ? 1.6 : 0) + (losses >= 2 ? 1 : 0) + (role === 'veteran' ? 0.2 : 0) + rng() * 1.1,
    wound: 0.4 + (c.recent.includes('D') ? 0.4 : 0) + (c.trust < 35 ? 0.7 : 0) + rng() * 1.3,
    calm: 0.9 + (role === 'captain' || role === 'veteran' ? 0.7 : 0) + rng() * 1,
  };
}

/** The four teammates for a fixture. */
export function buildRoom(c: RoomContext): Mate[] {
  const rng = seeded(c.seed);
  const pickOne = <T,>(a: readonly T[]) => a[Math.floor(rng() * a.length)];
  const others: Role[] = ['kid', 'keeper', 'veteran', 'striker', 'playmaker'];
  const roles: Role[] = ['captain'];
  while (roles.length < 4) {
    const r = pickOne(others);
    if (!roles.includes(r)) roles.push(r);
  }
  // the order on screen is shuffled so the captain is not always first
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const names = new Set<string>();
  const scored = roles.map((role) => {
    const s = moodScores(role, c, rng);
    const best = [...MOODS].sort((a, b) => s[b] - s[a]);
    return { role, best };
  });
  const moods = scored.map((x) => x.best[0]);
  // at most two heads in the same state, so the room always has something to read
  const count = (m: Mood) => moods.filter((x) => x === m).length;
  for (let i = 0; i < moods.length; i++) {
    if (count(moods[i]) <= 2) continue;
    const alt = scored[i].best.find((m) => m !== moods[i] && count(m) < 2);
    if (alt) moods[i] = alt;
  }
  const used = new Set<string>();
  const quote = (m: Mood) => {
    const free = QUOTES[m].filter((q) => !used.has(q));
    const q = pickOne(free.length ? free : QUOTES[m]);
    used.add(q);
    return q;
  };
  return scored.map((x, i) => {
    let name = pickOne(c.surnames);
    for (let k = 0; names.has(name) && k < 12; k++) name = pickOne(c.surnames);
    names.add(name);
    return {
      id: `${c.seed}:${i}`,
      name,
      role: x.role,
      mood: moods[i],
      look: randomLook(rng, c.nation),
      quote: quote(moods[i]),
    };
  });
}

const scale = (n: number, w: number) => (n === 0 ? 0 : Math.max(1, Math.round(n * w)));

export interface TalkOutcome {
  option: RitualOption;
  /** What he says back */
  reply: string;
  right: boolean;
}

/** What the group gets from the words you chose. */
export function talk(mate: Mate, approach: Approach, seed: string): TalkOutcome {
  const w = WEIGHT[mate.role];
  const id = `room-${seed}`;
  const spec = APPROACHES.find((a) => a.id === approach)!;
  const right = spec.fixes === mate.mood;
  if (right) {
    const base: Record<Approach, Omit<RitualOption, 'id' | 'emoji' | 'label' | 'line'>> = {
      reassure: { morale: 8, perfBonus: 2, rep: { lockerRoom: 3 }, expectation: 'Modest', brief: { clutchBonus: 0.04 } },
      ground: { morale: 5, perfBonus: 3, rep: { coachTrust: 3 }, expectation: 'Standard', brief: { oppRateMul: 0.94 } },
      lift: { morale: 10, perfBonus: 2, rep: { lockerRoom: 4 }, expectation: 'Standard', brief: { momentum: 12 } },
      focus: { morale: 6, perfBonus: 4, rep: { coachTrust: 2, lockerRoom: 2 }, expectation: 'Star Role' },
    };
    const b = base[approach];
    return {
      right: true,
      reply: WORKED[approach],
      option: {
        id,
        emoji: '🗣️',
        label: spec.label,
        line: WORKED[approach],
        morale: scale(b.morale, w),
        perfBonus: scale(b.perfBonus, w),
        rep: Object.fromEntries(Object.entries(b.rep).map(([k, v]) => [k, scale(v as number, w)])),
        expectation: b.expectation,
        brief: b.brief,
      },
    };
  }
  const reply = MISSED[mate.mood];
  return {
    right: false,
    reply,
    option: { id, emoji: '🗣️', label: spec.label, line: reply, morale: mate.mood === 'calm' ? 2 : 1, perfBonus: 0, rep: mate.mood === 'calm' ? {} : { lockerRoom: -1 }, expectation: 'Modest' },
  };
}
