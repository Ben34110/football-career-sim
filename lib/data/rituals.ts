import type { Brief, Expectation, Reputation } from '../types';

export interface RitualOption {
  id: string;
  emoji: string;
  label: string;
  /** One short reaction line once chosen */
  line: string;
  morale: number;
  perfBonus: number;
  rep: Partial<Reputation>;
  expectation: Expectation;
  /** Some choices are also a tactical call */
  brief?: Brief;
}

export interface Ritual {
  id: string;
  emoji: string;
  title: string;
  prompt: string;
  options: RitualOption[];
}

type Fx = { m?: number; p?: number; r?: Partial<Reputation>; x?: Expectation; b?: Brief };
const o = (id: string, emoji: string, label: string, line: string, fx: Fx): RitualOption => ({
  id,
  emoji,
  label,
  line,
  morale: fx.m ?? 4,
  perfBonus: fx.p ?? 1,
  rep: fx.r ?? {},
  expectation: fx.x ?? 'Standard',
  brief: fx.b,
});

/**
 * The pre-match moment changes every time: a one-word huddle, a teammate to rally, the playlist,
 * the walk-out, a bold prediction or the captain's tactical vote. One tap, one reaction.
 */
export const RITUALS: Ritual[] = [
  {
    id: 'word',
    emoji: '🗣️',
    title: 'One word',
    prompt: 'The huddle closes in. Give the group one word.',
    options: [
      o('fire', '🔥', 'Fire', 'The lads roar. You can feel the energy.', { m: 8, p: 2, r: { lockerRoom: 4 } }),
      o('brain', '🧠', 'Brain', 'Heads up. Smart football today.', { m: 4, p: 3, r: { coachTrust: 3 }, x: 'Modest' }),
      o('heart', '❤️', 'Heart', 'A hush, then a shout: “For each other!”', { m: 9, p: 1, r: { lockerRoom: 5, fanPopularity: 1 } }),
      o('ice', '🧊', 'Ice', 'Calm. Nobody blinks.', { m: 3, p: 4, r: { coachTrust: 2 }, x: 'Star Role' }),
    ],
  },
  {
    id: 'teammate',
    emoji: '🤝',
    title: 'A word with…',
    prompt: 'Who needs a word before you walk out?',
    options: [
      o('captain', '🎖️', 'The captain', 'He nods. “We go together.”', { m: 5, p: 1, r: { coachTrust: 4, lockerRoom: 2 } }),
      o('kid', '👶', 'The kid', 'His shoulders drop. He smiles.', { m: 5, p: 1, r: { lockerRoom: 5 } }),
      o('keeper', '🧤', 'The keeper', 'A fist bump. “Not one gets past me.”', { m: 4, p: 2, r: { lockerRoom: 3 } }),
      o('self', '🪞', 'Yourself', 'You stare in the mirror. “Today is yours.”', { m: 3, p: 4, r: { mediaHeat: 1 }, x: 'Star Role' }),
    ],
  },
  {
    id: 'playlist',
    emoji: '🎧',
    title: 'The playlist',
    prompt: 'The speakers are yours. What do you put on?',
    options: [
      o('hype', '🎧', 'Hype', 'The room is bouncing before kick-off.', { m: 10, p: 1, r: { lockerRoom: 2 } }),
      o('chill', '🎷', 'Chill', 'Shoulders loosen. Easy breathing.', { m: 6, p: 3, x: 'Modest' }),
      o('anthem', '🥁', 'Club anthem', 'Everyone sings along. One voice.', { m: 6, p: 1, r: { fanPopularity: 3, lockerRoom: 3 } }),
      o('silence', '🔇', 'Silence', 'Only the sound of studs on tiles.', { m: 2, p: 4, r: { coachTrust: 2 }, x: 'Star Role' }),
    ],
  },
  {
    id: 'tunnel',
    emoji: '🚪',
    title: 'The tunnel',
    prompt: 'You line up next to {opp} in the tunnel…',
    options: [
      o('handshake', '🤝', 'Shake hands', 'Respect shown. The press will like it.', { m: 4, p: 1, r: { fanPopularity: 2, coachTrust: 2, mediaHeat: -1 }, x: 'Modest' }),
      o('stare', '👀', 'Stare them down', 'They look away first.', { m: 5, p: 4, r: { mediaHeat: 3, lockerRoom: 2 }, x: 'Star Role' }),
      o('wave', '😎', 'Wave to the fans', 'The stand erupts as you walk out.', { m: 7, p: 1, r: { fanPopularity: 4 } }),
      o('pray', '🙏', 'A quiet moment', 'Eyes closed. Breathe. Go.', { m: 4, p: 3, r: { coachTrust: 1 } }),
    ],
  },
  {
    id: 'prediction',
    emoji: '🔮',
    title: 'The prediction',
    prompt: 'A journalist wants your prediction for {opp}.',
    options: [
      o('win', '✅', 'We win', 'Simple. Confident. No excuses.', { m: 5, p: 2, r: { fanPopularity: 1 }, x: 'Standard' }),
      o('score', '⚽', 'I score', 'You called your shot. Now deliver.', { m: 4, p: 4, r: { fanPopularity: 3, mediaHeat: 3 }, x: 'Star Role' }),
      o('clean', '🛡️', 'Clean sheet', 'The defence loves it.', { m: 5, p: 1, r: { lockerRoom: 3, coachTrust: 2 }, x: 'Modest', b: { oppRateMul: 0.9 } }),
      o('draw', '🤷', 'A point is fine', 'Nobody is thrilled — but nobody is surprised.', { m: 1, p: 0, r: { fanPopularity: -1 }, x: 'Modest' }),
    ],
  },
  {
    id: 'vote',
    emoji: '🗳️',
    title: 'Captain’s vote',
    prompt: 'The captain asks you: how do we start?',
    options: [
      o('press', '🔥', 'Press from minute one', 'Decision made. High and loud.', { m: 5, p: 1, r: { lockerRoom: 2 }, b: { momentum: 18, fatigue: 1 } }),
      o('compact', '🧱', 'Stay compact', 'Solid. They won’t find a gap.', { m: 3, p: 0, r: { coachTrust: 3 }, x: 'Modest', b: { oppRateMul: 0.82, myRateMul: 0.94 } }),
      o('counter', '⚡', 'Hit them on the break', 'Patience, then pace.', { m: 4, p: 1, b: { clutchBonus: 0.07, myRateMul: 0.9 } }),
      o('free', '🎯', 'Give me a free role', 'The captain smiles. “Don’t waste it.”', { m: 4, p: 3, r: { coachTrust: -1 }, x: 'Star Role', b: { target: 0.2 } }),
    ],
  },
];

export const RITUAL_BY_ID = Object.fromEntries(RITUALS.map((r) => [r.id, r]));

export interface RitualContext {
  /** Strength difference (mine − theirs) */
  diff: number;
  age: number;
  trust: number;
  important: boolean;
  home: boolean;
}

/** A different format each time: the last two are skipped, the situation tilts the odds. */
export function pickRitual(c: RitualContext, recent: string[], rng: () => number = Math.random): Ritual {
  const w: Record<string, number> = { word: 1, teammate: 1, playlist: 1, tunnel: 1, prediction: 1, vote: 0.8 };
  if (Math.abs(c.diff) >= 4) w.prediction += 1;
  if (c.age <= 20 || c.age >= 30) w.teammate += 1;
  if (c.important) w.tunnel += 1.5;
  if (c.home) w.playlist += 0.6;
  if (c.trust >= 50) w.vote += 0.7;
  const cool = new Set(recent.slice(-2));
  let entries = Object.entries(w).filter(([id]) => !cool.has(id));
  if (entries.length === 0) entries = Object.entries(w);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  let r = rng() * total;
  for (const [id, v] of entries) {
    r -= v;
    if (r <= 0) return RITUAL_BY_ID[id];
  }
  return RITUAL_BY_ID[entries[0][0]];
}
