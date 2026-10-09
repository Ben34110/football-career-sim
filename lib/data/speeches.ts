import type { Expectation, Reputation, StanceId } from '../types';

export interface StanceEffect {
  id: StanceId;
  label: string;
  /** What your player says in the dressing room */
  quote: string;
  tag: string;
  tone: 'good' | 'gold' | 'bad' | 'info';
  morale: number;
  rep: Partial<Reputation>;
  perfBonus: number;
  expectation: Expectation;
}

export interface Speech {
  id: string;
  title: string;
  /** The manager's team talk */
  quote: string;
  stances: [StanceEffect, StanceEffect, StanceEffect];
}

export const EXPECTATION_TARGET: Record<Expectation, number> = {
  Modest: 6.3,
  Standard: 6.9,
  'Star Role': 7.6,
};

type Override = Partial<Omit<StanceEffect, 'id' | 'quote'>>;

/** Seven ways to answer the gaffer; each speech offers three of them. */
const BASE: Record<StanceId, Omit<StanceEffect, 'id' | 'quote'>> = {
  'back-boss': { label: 'Back the gaffer', tag: 'Team player', tone: 'good', morale: 6, rep: { coachTrust: 4, lockerRoom: 1 }, perfBonus: 1, expectation: 'Modest' },
  'for-lads': { label: 'Rally the lads', tag: 'Leader', tone: 'gold', morale: 8, rep: { lockerRoom: 5, coachTrust: -1 }, perfBonus: 2, expectation: 'Standard' },
  'demand-ball': { label: 'Demand the ball', tag: 'High risk', tone: 'bad', morale: 3, rep: { fanPopularity: 2, lockerRoom: -3, coachTrust: -2, mediaHeat: 2 }, perfBonus: 4, expectation: 'Star Role' },
  'crack-joke': { label: 'Crack a joke', tag: 'Relaxed', tone: 'info', morale: 10, rep: { lockerRoom: 3, fanPopularity: 1 }, perfBonus: 0, expectation: 'Modest' },
  'stay-quiet': { label: 'Say nothing', tag: 'Focused', tone: 'info', morale: 2, rep: { coachTrust: 1 }, perfBonus: 3, expectation: 'Standard' },
  'challenge-boss': { label: 'Challenge the tactics', tag: 'Rebel', tone: 'bad', morale: 4, rep: { coachTrust: -5, lockerRoom: 3, mediaHeat: 3, fanPopularity: 1 }, perfBonus: 5, expectation: 'Star Role' },
  mentor: { label: 'Take a youngster aside', tag: 'Mentor', tone: 'good', morale: 5, rep: { lockerRoom: 4, coachTrust: 2 }, perfBonus: 1, expectation: 'Standard' },
};

const st = (id: StanceId, quote: string, over: Override = {}): StanceEffect => ({ id, ...BASE[id], quote, ...over });

const speech = (id: string, title: string, quote: string, a: StanceEffect, b: StanceEffect, c: StanceEffect): Speech => ({ id, title, quote, stances: [a, b, c] });

export const SPEECHES: Record<string, Speech> = {
  favourite: speech('favourite', 'Don’t Slip Up',
    '“Nobody expects us to drop points today. That is exactly what makes it dangerous. Respect them, play your game, and take what is ours.”',
    st('back-boss', '“Understood, boss. No complacency — we do the basics right.”'),
    st('for-lads', '“Lads, we set the tempo from minute one. Nobody switches off.”'),
    st('demand-ball', '“Give me the ball in the final third and I will finish the job.”')),
  underdog: speech('underdog', 'Nothing To Lose',
    '“They are better on paper. Paper does not play football. Stay compact, hit them on the break, and believe it for ninety minutes.”',
    st('back-boss', '“We stick to the plan, boss. Discipline wins these games.”', { perfBonus: 2 }),
    st('for-lads', '“They think we’ll fold. Let’s show them who we are!”', { morale: 10 }),
    st('demand-ball', '“One chance is all I need. Find me on the counter.”', { perfBonus: 5, rep: { fanPopularity: 3, lockerRoom: -3, coachTrust: -2, mediaHeat: 2 } })),
  derby: speech('derby', 'Derby Day',
    '“This is not three points. This is the pride of the whole city. Leave everything on that pitch — I want blood, sweat, and heart.”',
    st('back-boss', '“Heart and discipline, boss. We keep our heads.”'),
    st('for-lads', '“Every tackle, every duel — we fight for each other today!”', { rep: { lockerRoom: 6, fanPopularity: 1, coachTrust: -1 }, morale: 9 }),
    st('demand-ball', '“The fans want a hero. I’m going to be that hero.”', { rep: { fanPopularity: 4, lockerRoom: -3, coachTrust: -2, mediaHeat: 3 }, perfBonus: 5 })),
  cup: speech('cup', 'Knockout Football',
    '“One game, no second chances. Keep it tight, stay calm if it goes to penalties, and remember why you play this game.”',
    st('back-boss', '“Calm heads, boss. If it goes to penalties we are ready.”'),
    st('for-lads', '“We win this together — whoever steps up, we back them!”'),
    st('demand-ball', '“Put me on the spot if it comes to that. I want the big moment.”', { rep: { fanPopularity: 3, lockerRoom: -2, coachTrust: -1, mediaHeat: 2 }, perfBonus: 5 })),
  trust: speech('trust', 'Earn Your Place',
    '“Some of you have to prove you belong in this squad. Training is one thing — matches are another. Show me something today.”',
    st('back-boss', '“Understood, boss. I’ll earn my minutes.”', { rep: { coachTrust: 6, lockerRoom: 1 }, morale: 5 }),
    st('for-lads', '“We’re all pushing each other. That’s what makes us better.”'),
    st('demand-ball', '“I deserve to start every week. Today I’ll prove it.”', { perfBonus: 5, rep: { fanPopularity: 2, lockerRoom: -3, coachTrust: -3, mediaHeat: 2 } })),
  international: speech('international', 'For the Badge',
    '“Wearing this shirt is the biggest honour of your career. Millions are watching. Play with pride and leave it all out there.”',
    st('back-boss', '“I’ll give everything for this shirt, coach.”', { rep: { coachTrust: 5, lockerRoom: 2 } }),
    st('for-lads', '“We’re a family out there — let’s do this for our country!”', { rep: { lockerRoom: 6, fanPopularity: 2, coachTrust: -1 }, morale: 10 }),
    st('demand-ball', '“I was born for nights like this. Give me the ball.”', { rep: { fanPopularity: 5, lockerRoom: -3, coachTrust: -2, mediaHeat: 3 }, perfBonus: 5 })),

  // ───── situational talks ─────
  bounce: speech('bounce', 'Bounce Back',
    '“Last time out was not us. I am not interested in excuses — I want a reaction, and I want it from the first whistle.”',
    st('back-boss', '“We owe the fans a response, boss. It starts now.”'),
    st('crack-joke', '“Good news, lads: it can’t get worse. Let’s go and enjoy it!”'),
    st('stay-quiet', 'You stare at the floor, boots laced, jaw set. No words — only intent.')),
  streak: speech('streak', 'Stay Hungry',
    '“Three wins in a row and everybody is smiling. That is exactly when teams get sloppy. Stay hungry.”',
    st('for-lads', '“Nobody is allowed to relax. We’re building something here.”'),
    st('crack-joke', '“Smiling is fine, boss — as long as we keep winning!”'),
    st('demand-ball', '“I’m on fire. Keep feeding me and we keep winning.”', { rep: { fanPopularity: 3, lockerRoom: -3, coachTrust: -2, mediaHeat: 2 }, perfBonus: 5 })),
  slump: speech('slump', 'Find Your Spark',
    '“Some of you are playing with fear. Forget the last few games. Express yourselves — football is meant to be fun.”',
    st('back-boss', '“I hear you, boss. I’ll shake off the nerves.”', { morale: 7 }),
    st('mentor', '“Stay with me, kid — we’ll find our rhythm together.”'),
    st('challenge-boss', '“Maybe the problem is the system, boss. Let us play freely.”')),
  title: speech('title', 'Title Race',
    '“We are in the fight for the title. Every point counts from here. Respect the process — but go and take it.”',
    st('for-lads', '“This is our year. Every one of us has to be ready.”'),
    st('stay-quiet', 'You say nothing. You just tap every teammate on the shoulder on the way out.'),
    st('demand-ball', '“Title races are won by players who want the ball. I want it.”', { rep: { fanPopularity: 4, lockerRoom: -3, coachTrust: -2, mediaHeat: 3 }, perfBonus: 5 })),
  survival: speech('survival', 'Fight For Survival',
    '“Nobody wants to talk about the table but we all know where we are. Work harder than them, run further than them.”',
    st('back-boss', '“We’ll run until our legs fall off, boss.”'),
    st('for-lads', '“Look around — nobody here is giving up!”', { morale: 9 }),
    st('mentor', '“Stay calm. I’ll talk to the youngsters — they’re shaking.”')),
  kid: speech('kid', 'The Kid Is Ready',
    '“You have shown me something in training. Today you start and I expect you to play without fear.”',
    st('back-boss', '“Thank you for the trust, boss. I won’t let you down.”', { rep: { coachTrust: 5, lockerRoom: 1 }, morale: 8 }),
    st('crack-joke', '“Finally! I was getting tired of the bench anyway.”'),
    st('demand-ball', '“I’m ready. Don’t be surprised if I take the game over.”', { rep: { fanPopularity: 3, lockerRoom: -3, coachTrust: -1, mediaHeat: 2 }, perfBonus: 5 })),
  veteran: speech('veteran', 'Lead By Example',
    '“You have been there before. The young ones look at you — show them what professionalism looks like.”',
    st('mentor', '“Leave it to me, boss. I’ll guide them out there.”'),
    st('back-boss', '“Always, boss. Standards don’t drop on my watch.”'),
    st('for-lads', '“Experience wins matches. Follow my lead, lads.”')),
  final: speech('final', 'Final Day',
    '“There are two kinds of players: those who remember finals and those who forget them. Make sure you are remembered.”',
    st('for-lads', '“Win it for the club, win it for each other!”'),
    st('stay-quiet', 'You close your eyes for a minute. When you open them, the nerves are gone.'),
    st('demand-ball', '“Give me the final, boss. I’ve been waiting for this all my life.”', { rep: { fanPopularity: 5, lockerRoom: -3, coachTrust: -2, mediaHeat: 3 }, perfBonus: 5 })),
  stage: speech('stage', 'The World Stage',
    '“Knockout football at the highest level. The next ninety minutes will be replayed for decades. Be brave.”',
    st('back-boss', '“We’re ready, coach. We’ve prepared for this.”'),
    st('crack-joke', '“Relax, lads — it’s just a game in front of a billion people.”'),
    st('challenge-boss', '“I’d play them differently, coach. Trust me with a free role.”')),
  routine: speech('routine', 'Business As Usual',
    '“No big speech today. Do the simple things well, support each other and the result will take care of itself.”',
    st('back-boss', '“Simple and solid, boss. We’ll deliver.”'),
    st('crack-joke', '“No speech? That’s the shortest and best one of the season!”'),
    st('mentor', '“I’ll keep an eye on the kid in training — he’s a talent.”')),
};

export interface SpeechContext {
  kind: 'league' | 'cup' | 'intl' | 'tournament';
  label: string;
  /** Strength difference (mine − theirs) */
  diff: number;
  trust: number;
  age: number;
  /** Average of the last three ratings, or null */
  formAvg: number | null;
  /** Results of the last three played fixtures, newest last */
  recent: ('W' | 'D' | 'L')[];
  leaguePos: number;
  played: number;
}

let lastSpeech: string | null = null;

/** Picks a talk that fits the situation — and never the same one twice in a row. */
export function pickSpeech(c: SpeechContext, rng: () => number = Math.random): Speech {
  const w: Record<string, number> = { routine: 0.6 };
  const add = (id: string, weight: number) => (w[id] = (w[id] ?? 0) + weight);

  if (c.kind === 'intl' || c.kind === 'tournament') {
    add('international', 3);
    if (c.kind === 'tournament' && c.label !== 'Group Stage Decider') add('stage', 4);
  }
  if (c.kind === 'cup') {
    add('cup', 3);
    if (c.label === 'Cup Final') add('final', 7);
  }
  if (c.kind === 'tournament' && c.label === 'Final') add('final', 7);
  if (c.trust < 30) add('trust', 5);
  if (/Matchday (5|10)$/.test(c.label)) add('derby', 4);
  if (c.diff >= 4) add('favourite', 3);
  if (c.diff <= -4) add('underdog', 3);
  const last = c.recent[c.recent.length - 1];
  if (last === 'L') add('bounce', 4);
  if (c.recent.length === 3 && c.recent.every((r) => r === 'W')) add('streak', 4);
  if (c.formAvg !== null && c.formAvg < 6) add('slump', 4);
  if (c.kind === 'league' && c.played >= 5 && c.leaguePos <= 2) add('title', 3);
  if (c.kind === 'league' && c.played >= 5 && c.leaguePos >= 8) add('survival', 3);
  if (c.age <= 20 && c.trust >= 50) add('kid', 2.5);
  if (c.age >= 30) add('veteran', 2.5);

  const entries = Object.entries(w).filter(([id]) => id !== lastSpeech && id in SPEECHES);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  let r = rng() * total;
  let chosen = entries[0][0];
  for (const [id, v] of entries) {
    r -= v;
    if (r <= 0) {
      chosen = id;
      break;
    }
  }
  lastSpeech = chosen;
  return SPEECHES[chosen];
}

export interface ExpectationEffect {
  morale: number;
  rep: Partial<Reputation>;
  text: string;
}

/** Consequence of meeting (or missing) the expectation set in the locker room. */
export function expectationEffect(exp: Expectation, met: boolean): ExpectationEffect {
  const table: Record<Expectation, { met: ExpectationEffect; miss: ExpectationEffect }> = {
    Modest: {
      met: { morale: 2, rep: { coachTrust: 1 }, text: 'You delivered a solid shift, as promised.' },
      miss: { morale: -1, rep: { coachTrust: -1 }, text: 'Even a modest bar was too high today.' },
    },
    Standard: {
      met: { morale: 3, rep: { lockerRoom: 2, coachTrust: 1 }, text: 'You led by example — the lads noticed.' },
      miss: { morale: -2, rep: { lockerRoom: -1 }, text: 'You promised to lead but never found your rhythm.' },
    },
    'Star Role': {
      met: { morale: 5, rep: { fanPopularity: 4, mediaHeat: 3, coachTrust: 1 }, text: 'You asked for the ball and delivered. Star performance!' },
      miss: { morale: -5, rep: { fanPopularity: -3, lockerRoom: -3, coachTrust: -3, mediaHeat: 2 }, text: 'You demanded the spotlight and wilted under it.' },
    },
  };
  return met ? table[exp].met : table[exp].miss;
}
