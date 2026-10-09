import type { PressContext, PressStyle } from './press';
import type { Reputation } from '../types';

export type ReactStyle = 'apologise' | 'defend' | 'silence' | 'counter';

export interface ControversyCtx extends PressContext {
  answerStyle: PressStyle;
  /** The player chose to feed the media */
  stirred: boolean;
  apps: number;
  /** Media advisor level (0-3) */
  pr?: number;
}

export interface Effect {
  morale: number;
  rep: Partial<Reputation>;
  /** Strike change (3 strikes = contract terminated) */
  strike: number;
  /** Fine in €K */
  fine?: number;
}

export interface ControversyOption {
  style: ReactStyle;
  label: string;
  hint: string;
  risk: 'Safe' | 'Balanced' | 'Bold';
  /** Base chance the reaction lands well */
  p: number;
  quote: string;
  win: Effect;
  lose: Effect;
  winText: string;
  loseText: string;
}

export interface Controversy {
  id: string;
  title: string;
  setup: string;
  headline: string;
  weight: number;
  when: (c: ControversyCtx) => boolean;
  options: ControversyOption[];
}

/** Reaction templates shared by every scandal; only the quotes change. */
const STYLE = {
  apologise: {
    label: 'Apologise publicly',
    hint: 'Take responsibility, calm things down',
    risk: 'Safe' as const,
    p: 0.62,
    win: { morale: 2, rep: { coachTrust: 3, lockerRoom: 2, fanPopularity: 2, mediaHeat: -3 }, strike: -1 } as Effect,
    lose: { morale: -3, rep: { coachTrust: -1, mediaHeat: 2 }, strike: 0 } as Effect,
    winText: 'The apology lands well. The story dies down and people respect you for it.',
    loseText: 'The apology feels hollow to some, but the damage stays limited.',
  },
  defend: {
    label: 'Defend yourself',
    hint: 'Put your side of the story across',
    risk: 'Balanced' as const,
    p: 0.5,
    win: { morale: 3, rep: { fanPopularity: 4, lockerRoom: 1, mediaHeat: 3 }, strike: 0 } as Effect,
    lose: { morale: -5, rep: { coachTrust: -5, lockerRoom: -4, mediaHeat: 6 }, strike: 1 } as Effect,
    winText: 'Your explanation convinces people. The fans are behind you.',
    loseText: 'It sounds like an excuse. The club is not impressed and the story grows.',
  },
  silence: {
    label: 'Stay silent',
    hint: 'Let it blow over',
    risk: 'Safe' as const,
    p: 0.6,
    win: { morale: 0, rep: { mediaHeat: -2 }, strike: 0 } as Effect,
    lose: { morale: -4, rep: { coachTrust: -3, fanPopularity: -3, mediaHeat: 4 }, strike: 1 } as Effect,
    winText: 'Nothing more is said and the story fades by the weekend.',
    loseText: 'Your silence is read as an admission. Pressure keeps building.',
  },
  counter: {
    label: 'Hit back',
    hint: 'Go on the offensive against the press',
    risk: 'Bold' as const,
    p: 0.36,
    win: { morale: 5, rep: { fanPopularity: 6, mediaHeat: 8, lockerRoom: 1 }, strike: 0 } as Effect,
    lose: { morale: -7, rep: { coachTrust: -8, lockerRoom: -6, fanPopularity: -6, mediaHeat: 10 }, strike: 1, fine: 1 } as Effect,
    winText: 'You turn the tables — the supporters love your fighting spirit.',
    loseText: 'It backfires badly. The club fines you and the dressing room loses patience.',
  },
};

type Quotes = Record<ReactStyle, string>;
type Tweaks = Partial<Record<ReactStyle, Partial<ControversyOption>>>;

/** Every scandal reuses the four reactions; `tweaks` rewrites the ones that behave differently in that story. */
const options = (q: Quotes, tweaks: Tweaks = {}): ControversyOption[] =>
  (Object.keys(STYLE) as ReactStyle[]).map((style) => ({ style, quote: q[style], ...STYLE[style], ...tweaks[style] }));

/** Admitting guilt for something you did not do. */
const FALSE_CONFESSION: Partial<ControversyOption> = {
  label: 'Admit it and apologise',
  hint: 'Accept the blame to end the story',
  risk: 'Bold',
  p: 0.14,
  win: { morale: 0, rep: { mediaHeat: 2 }, strike: 0 },
  lose: { morale: -6, rep: { coachTrust: -6, fanPopularity: -4, lockerRoom: -2, mediaHeat: 5 }, strike: 1 },
  winText: 'The story fades — but nobody is really sure what you admitted.',
  loseText: 'Apologising looks like a confession. The press now treats the lie as fact.',
};

export const CONTROVERSIES: Controversy[] = [
  {
    id: 'leak',
    title: 'Dressing-Room Leak',
    setup: 'An audio clip of you criticising the coach in the changing room has leaked online.',
    headline: 'LEAKED: the audio that could split the dressing room',
    weight: 4,
    when: (c) => c.coachTrust < 62 || c.answerStyle === 'bold',
    options: options({
      apologise: '“I said things in the heat of the moment. I’ve already apologised to the coach and the lads.”',
      defend: '“That was a private conversation, taken out of context. I care about this team.”',
      silence: '“I won’t comment on anything said inside the dressing room.”',
      counter: '“Who leaks private conversations? That’s the real scandal here.”',
    }),
  },
  {
    id: 'night-out',
    title: 'Late-Night Photos',
    setup: 'Photos of you leaving a nightclub in the early hours are all over the tabloids.',
    headline: 'PARTY NIGHT: pictures that will anger the coach',
    weight: 4,
    when: (c) => c.mediaHeat >= 22,
    options: options({
      apologise: '“It was a day off, but I know it doesn’t look professional. It won’t happen again.”',
      defend: '“It was a family birthday. I’m not the first player to go out on a day off.”',
      silence: '“My private life is private.”',
      counter: '“Photographers camping outside a club at 3 a.m. — that’s the story.”',
    }),
  },
  {
    id: 'post',
    title: 'Resurfaced Post',
    setup: 'An old social-media post of yours has resurfaced and fans are furious.',
    headline: 'BACKLASH: old post sparks outrage',
    weight: 3,
    when: (c) => c.mediaHeat >= 15,
    options: options({
      apologise: '“That post was wrong and I regret it. I was young and I’ve learned.”',
      defend: '“I was a teenager. People change — look at who I am today.”',
      silence: '“I’ve deleted my accounts for now. I’m focused on football.”',
      counter: '“Digging up a years-old post? Say it to my face.”',
    }),
  },
  {
    id: 'feud',
    title: 'Row With A Teammate',
    setup: 'A training-ground argument with a teammate was filmed by a fan and is going viral.',
    headline: 'TRAINING-GROUND BUST-UP: is the squad falling apart?',
    weight: 4,
    when: (c) => c.lockerRoom < 58,
    options: options({
      apologise: '“I apologised to him straight away. We’re brothers on this pitch.”',
      defend: '“It was a heated session, nothing more. Competition makes us better.”',
      silence: '“What happens at training stays at training.”',
      counter: '“Instead of filming us, come and support the team.”',
    }),
  },
  {
    id: 'ref',
    title: 'Referee Row',
    setup: 'Cameras caught you screaming in the referee’s face after the final whistle.',
    headline: 'FURY AT THE FINAL WHISTLE: star confronts the referee',
    weight: 4,
    when: (c) => c.outcome === 'L',
    options: options({
      apologise: '“I lost my head. I’ve written to the referee to apologise.”',
      defend: '“Some decisions were baffling. I reacted as any competitor would.”',
      silence: '“I’ll let the federation do its job.”',
      counter: '“Is it normal that every call goes against us? Someone has to say it.”',
    }),
  },
  {
    id: 'agent',
    title: 'Agent Overstep',
    setup: 'Your agent told a newspaper you “deserve a bigger club” — your manager is livid.',
    headline: 'WANTAWAY? Agent claims star deserves a bigger stage',
    weight: 3,
    when: (c) => c.mediaHeat >= 30,
    options: options({
      apologise: '“My agent spoke out of turn. I’m fully committed to this club.”',
      defend: '“Ambition is not disloyalty. But my focus is here.”',
      silence: '“I’ll leave that to my agent and the club to discuss.”',
      counter: '“I’m the one who decides my future — not the newspapers.”',
    }),
  },
  {
    id: 'fans',
    title: 'Clash With Supporters',
    setup: 'A video shows you answering back to a heckler in the stands.',
    headline: 'BOILING OVER: star snaps at his own fans',
    weight: 3,
    when: (c) => c.outcome === 'L' || c.rating < 6,
    options: options({
      apologise: '“The fans pay their money and deserve respect. I was wrong.”',
      defend: '“He insulted my family. I’m human, too.”',
      silence: '“I’d rather talk on the pitch.”',
      counter: '“Real supporters back their players when it’s tough.”',
    }),
  },
  {
    id: 'sub-anger',
    title: 'Substitution Fury',
    setup: 'You were seen hurling your shirt to the ground when the coach took you off.',
    headline: 'TANTRUM: star throws shirt after being substituted',
    weight: 8,
    when: (c) => c.subbedOff,
    options: options({
      apologise: '“I was angry at myself. I’ve told the coach it was disrespectful.”',
      defend: '“I’m a competitor — I want to play every minute. It’s not a crime.”',
      silence: '“It’s between me and the coach.”',
      counter: '“Everybody shows emotion in this sport. Don’t make it bigger than it is.”',
    }),
  },
  {
    id: 'penalty-row',
    title: 'Penalty Row',
    setup: 'Reports claim you snatched the ball from the designated taker before your miss.',
    headline: 'PENALTY ROW: did the star steal the ball?',
    weight: 8,
    when: (c) => c.missedKick,
    options: options({
      apologise: '“I should have respected the pecking order. I’ve spoken to him.”',
      defend: '“It was agreed on the pitch. I take responsibility for the miss.”',
      silence: '“It’s forgotten. We move on.”',
      counter: '“If someone is afraid to take responsibility, it won’t be me.”',
    }),
  },
  {
    id: 'liar',
    title: 'Accused of Lying',
    setup: 'A newspaper claims you lied about an injury to skip training, and quotes “sources” inside the club.',
    headline: 'CAUGHT OUT? Newspaper says star lied about injury',
    weight: 5,
    when: (c) => c.mediaHeat >= 15 || c.answerStyle === 'bold',
    options: options(
      {
        apologise: '“Fine — I should have been clearer with the staff. I’m sorry for the confusion.”',
        defend: '“The medical staff have my full file. Check it. I have nothing to hide.”',
        silence: '“I won’t dignify this with an answer.”',
        counter: '“Name your sources. If this is a lie, my lawyers will deal with it.”',
      },
      {
        apologise: FALSE_CONFESSION,
        defend: { label: 'Show the evidence', hint: 'Let the medical file speak', p: 0.64 },
        silence: { p: 0.3, hint: 'Silence can look like guilt' },
        counter: { label: 'Threaten legal action', p: 0.44 },
      },
    ),
  },
  {
    id: 'fake-handshake',
    title: 'Fabricated Story',
    setup: 'A viral account claims you refused to shake your manager’s hand when you were substituted. It never happened.',
    headline: 'HANDSHAKE SNUB: is the star at war with his manager?',
    weight: 4,
    when: (c) => c.coachTrust < 72 && c.mediaHeat >= 10,
    options: options(
      {
        apologise: '“If that’s how it looked, I’m sorry to the boss and the fans.”',
        defend: '“It’s simply false — I hugged him. There’s video of it.”',
        silence: '“I don’t respond to rumours.”',
        counter: '“Whoever invented this should be ashamed. The club will find them.”',
      },
      {
        apologise: FALSE_CONFESSION,
        defend: { label: 'Set the record straight', hint: 'Calmly show it never happened', p: 0.66 },
        silence: { p: 0.4 },
        counter: { p: 0.46 },
      },
    ),
  },
  {
    id: 'loyalty',
    title: 'Loyalty Questioned',
    setup: 'Fans dug up your words — “I would never leave” — right after reports of a secret meeting with another club.',
    headline: 'DOUBLE GAME? Star said “never” — then met a rival',
    weight: 4,
    when: (c) => c.mediaHeat >= 28,
    options: options(
      {
        apologise: '“I owe the supporters honesty: I listened to an offer. I’m staying focused on this club.”',
        defend: '“A player talks to many people. My loyalty has never wavered.”',
        silence: '“I’ll talk when there’s something to say.”',
        counter: '“I gave everything for this shirt. Don’t question me.”',
      },
      {
        apologise: { label: 'Come clean', hint: 'Be honest about the meeting', p: 0.58, risk: 'Balanced' },
        defend: { p: 0.3, risk: 'Bold' },
        silence: { p: 0.35 },
        counter: { p: 0.34 },
      },
    ),
  },
];

/** Chance (0..1) that a scandal breaks after a press conference. */
export function controversyChance(c: ControversyCtx): number {
  if (c.apps < 2) return 0;
  let p = 0.05 + c.mediaHeat / 380;
  if (c.answerStyle === 'bold') p += 0.12;
  if (c.answerStyle === 'no-comment') p += 0.04;
  if (c.stirred) p += 0.2;
  if (c.missedKick) p += 0.08;
  if (c.subbedOff) p += 0.2;
  if (c.lockerRoom < 30) p += 0.06;
  return Math.min(0.6, p * (1 - 0.15 * (c.pr ?? 0)));
}

/** Chance that a given reaction lands well, adjusted by the player's standing. */
export function reactionChance(o: ControversyOption, c: Pick<ControversyCtx, 'coachTrust' | 'lockerRoom' | 'mediaHeat'> & { fanPopularity: number }, pr = 0): number {
  const adj = 0.04 * pr + (c.coachTrust - 50) / 250 + (c.fanPopularity - 50) / 300 + (c.lockerRoom - 50) / 400 - (c.mediaHeat - 30) / 500;
  return Math.max(0.08, Math.min(0.92, o.p + adj));
}

/** Newspaper headlines generated from the way a press question was answered. */
const HEADLINES: Record<PressStyle, string[]> = {
  tactical: ['{name} talks tactics: “the structure is the key”', 'Cool head: {name} puts the team first'],
  deflect: ['{name} sidesteps the question with a smile', 'Diplomatic {name} gives nothing away'],
  humble: ['Humble {name} wins hearts', '{name} credits the group: “the lads deserve it”'],
  bold: ['{name} sets the media alight', 'BOMBSHELL: {name} speaks out', '{name} turns up the heat'],
  'no-comment': ['What is {name} hiding? Star refuses to speak', 'Silence from {name} — the press smells blood'],
};
const STIRRED = ['{name} lights the touchpaper: “you haven’t seen anything yet”', 'WAR OF WORDS: {name} fuels the fire'];
const OUTLETS = ['The Matchday Post', 'Foot Direct', 'Sport Quotidien', 'The Terrace Tribune'];

export function headlineFor(style: PressStyle, stirred: boolean, rng: () => number = Math.random) {
  const pool = stirred ? STIRRED : HEADLINES[style];
  return {
    outlet: OUTLETS[Math.floor(rng() * OUTLETS.length)],
    text: pool[Math.floor(rng() * pool.length)],
  };
}
