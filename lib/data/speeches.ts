import type { Expectation, Reputation, StanceId } from '../types';

export interface StanceEffect {
  id: StanceId;
  label: string;
  /** What your player says in the dressing room */
  quote: string;
  tag: string;
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

type Override = Partial<StanceEffect> & Pick<StanceEffect, 'quote'>;

const stances = (a: Override, b: Override, c: Override): Speech['stances'] => [
  {
    id: 'back-boss',
    label: 'Back the gaffer',
    tag: 'Team player',
    morale: 6,
    rep: { coachTrust: 4, lockerRoom: 1 },
    perfBonus: 1,
    expectation: 'Modest',
    ...a,
  },
  {
    id: 'for-lads',
    label: 'Rally the lads',
    tag: 'Leader',
    morale: 8,
    rep: { lockerRoom: 5, coachTrust: -1 },
    perfBonus: 2,
    expectation: 'Standard',
    ...b,
  },
  {
    id: 'demand-ball',
    label: 'Demand the ball',
    tag: 'High risk',
    morale: 3,
    rep: { fanPopularity: 2, lockerRoom: -3, coachTrust: -2, mediaHeat: 2 },
    perfBonus: 4,
    expectation: 'Star Role',
    ...c,
  },
];

export const SPEECHES: Record<string, Speech> = {
  favourite: {
    id: 'favourite',
    title: 'Don’t Slip Up',
    quote:
      '“Nobody expects us to drop points today. That is exactly what makes it dangerous. Respect them, play your game, and take what is ours.”',
    stances: stances(
      { quote: '“Understood, boss. No complacency — we do the basics right.”' },
      { quote: '“Lads, we set the tempo from minute one. Nobody switches off.”' },
      { quote: '“Give me the ball in the final third and I will finish the job.”' },
    ),
  },
  underdog: {
    id: 'underdog',
    title: 'Nothing To Lose',
    quote:
      '“They are better on paper. Paper does not play football. Stay compact, hit them on the break, and believe it for ninety minutes.”',
    stances: stances(
      { quote: '“We stick to the plan, boss. Discipline wins these games.”', perfBonus: 2 },
      { quote: '“They think we’ll fold. Let’s show them who we are!”', morale: 10 },
      {
        quote: '“One chance is all I need. Find me on the counter.”',
        perfBonus: 5,
        rep: { fanPopularity: 3, lockerRoom: -3, coachTrust: -2, mediaHeat: 2 },
      },
    ),
  },
  derby: {
    id: 'derby',
    title: 'Derby Day',
    quote:
      '“This is not three points. This is the pride of the whole city. Leave everything on that pitch — I want blood, sweat, and heart.”',
    stances: stances(
      { quote: '“Heart and discipline, boss. We keep our heads.”' },
      {
        quote: '“Every tackle, every duel — we fight for each other today!”',
        rep: { lockerRoom: 6, fanPopularity: 1, coachTrust: -1 },
        morale: 9,
      },
      {
        quote: '“The fans want a hero. I’m going to be that hero.”',
        rep: { fanPopularity: 4, lockerRoom: -3, coachTrust: -2, mediaHeat: 3 },
        perfBonus: 5,
      },
    ),
  },
  cup: {
    id: 'cup',
    title: 'Knockout Football',
    quote:
      '“One game, no second chances. Keep it tight, stay calm if it goes to penalties, and remember why you play this game.”',
    stances: stances(
      { quote: '“Calm heads, boss. If it goes to penalties we are ready.”' },
      { quote: '“We win this together — whoever steps up, we back them!”' },
      {
        quote: '“Put me on the spot if it comes to that. I want the big moment.”',
        rep: { fanPopularity: 3, lockerRoom: -2, coachTrust: -1, mediaHeat: 2 },
        perfBonus: 5,
      },
    ),
  },
  trust: {
    id: 'trust',
    title: 'Earn Your Place',
    quote:
      '“Some of you have to prove you belong in this squad. Training is one thing — matches are another. Show me something today.”',
    stances: stances(
      { quote: '“Understood, boss. I’ll earn my minutes.”', rep: { coachTrust: 6, lockerRoom: 1 }, morale: 5 },
      { quote: '“We’re all pushing each other. That’s what makes us better.”' },
      {
        quote: '“I deserve to start every week. Today I’ll prove it.”',
        perfBonus: 5,
        rep: { fanPopularity: 2, lockerRoom: -3, coachTrust: -3, mediaHeat: 2 },
      },
    ),
  },
  international: {
    id: 'international',
    title: 'For the Badge',
    quote:
      '“Wearing this shirt is the biggest honour of your career. Millions are watching. Play with pride and leave it all out there.”',
    stances: stances(
      { quote: '“I’ll give everything for this shirt, coach.”', rep: { coachTrust: 5, lockerRoom: 2 } },
      {
        quote: '“We’re a family out there — let’s do this for our country!”',
        rep: { lockerRoom: 6, fanPopularity: 2, coachTrust: -1 },
        morale: 10,
      },
      {
        quote: '“I was born for nights like this. Give me the ball.”',
        rep: { fanPopularity: 5, lockerRoom: -3, coachTrust: -2, mediaHeat: 3 },
        perfBonus: 5,
      },
    ),
  },
};

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
