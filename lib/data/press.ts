import type { FixtureKind, Outcome, Reputation } from '../types';

export type PressStyle = 'tactical' | 'bold' | 'humble' | 'deflect' | 'no-comment';

export interface PressAnswer {
  id: string;
  style: PressStyle;
  label: string;
  quote: string;
  morale: number;
  rep: Partial<Reputation>;
}

export interface PressContext {
  outcome: Outcome;
  goals: number;
  rating: number;
  assists: number;
  knockout: boolean;
  /** Player scored/missed a penalty or free kick */
  missedKick: boolean;
  mediaHeat: number;
  coachTrust: number;
  /** Started on the bench */
  benched: boolean;
  /** Taken off by the coach */
  subbedOff: boolean;
  /** Shown a red card */
  sentOff: boolean;
  lockerRoom: number;
  fanPopularity: number;
  apps: number;
  /** Opponent and score (in the player's team order) for context-aware questions */
  opp: string;
  myScore: number;
  oppScore: number;
  label: string;
  /** Last results, newest last */
  recent: Outcome[];
  /** How the press feels about you (-100…100) */
  mood: number;
  // for the newspaper page
  kind: FixtureKind;
  meHome: boolean;
  myTeam: string;
  shootout?: { my: number; opp: number };
}

export interface PressQuestion {
  id: string;
  reporter: string;
  outlet: string;
  question: string;
  when: (c: PressContext) => boolean;
  answers: PressAnswer[];
  weight: number;
  /** Hostile questions come when the press dislikes you, friendly ones when it likes you */
  tone?: 'hostile' | 'friendly';
}

const NO_COMMENT: PressAnswer = {
  id: 'no-comment',
  style: 'no-comment',
  label: 'No Comment',
  quote: '“No comment.”',
  morale: 0,
  rep: { mediaHeat: -2, fanPopularity: -1 },
};

export const PRESS_QUESTIONS: PressQuestion[] = [
  {
    id: 'rival',
    reporter: 'Vincent Aubert',
    outlet: 'Téléfoot Plus',
    question: 'A rival striker says he is a better player than you. Do you want to respond?',
    weight: 5,
    when: (c) => c.mediaHeat >= 18,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Let the pitch talk', quote: '“Comparisons are for you journalists. I’ll answer on the pitch.”', morale: 1, rep: { coachTrust: 2, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Fire back', quote: '“Let him say what he wants. Count the trophies and the goals, then ask again.”', morale: 4, rep: { fanPopularity: 5, mediaHeat: 8, lockerRoom: -2 } },
      { id: 'humble', style: 'humble', label: 'Respect him', quote: '“He’s a great player. We all want to be the best, that’s football.”', morale: 1, rep: { fanPopularity: 2, lockerRoom: 3, mediaHeat: -1 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'referee',
    reporter: 'Samuel Baptiste',
    outlet: 'Eleven Sports Live',
    question: 'Some controversial refereeing decisions today. Did the officials cost your team?',
    weight: 4,
    when: (c) => c.outcome !== 'W',
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Stay respectful', quote: '“Referees have a hard job. We should have made our own luck.”', morale: 0, rep: { coachTrust: 3, mediaHeat: -2 } },
      { id: 'bold', style: 'bold', label: 'Slam the officials', quote: '“Some decisions were a joke. I won’t pretend otherwise.”', morale: 2, rep: { fanPopularity: 4, mediaHeat: 8, coachTrust: -3 } },
      { id: 'humble', style: 'humble', label: 'Blame ourselves', quote: '“We can’t blame anyone. We weren’t good enough.”', morale: -1, rep: { lockerRoom: 3, coachTrust: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'beat-opp',
    reporter: 'Maëlys Roux',
    outlet: 'Stade 2 Soir',
    question: 'A {my}–{their} win over {opp}. How important was this one for the club?',
    weight: 4,
    when: (c) => c.outcome === 'W' && c.myScore >= 2,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Praise the preparation', quote: '“The staff prepared {opp} perfectly. We executed the plan.”', morale: 2, rep: { coachTrust: 3, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Send a message', quote: '“Everyone should look at the table. We’re coming for them all.”', morale: 4, rep: { fanPopularity: 4, mediaHeat: 5, lockerRoom: -1 } },
      { id: 'humble', style: 'humble', label: 'Stay grounded', quote: '“Three points, nothing more. We go again on Saturday.”', morale: 2, rep: { lockerRoom: 3, coachTrust: 1 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'lost-opp',
    reporter: 'Gaël Ferrand',
    outlet: 'Canal Football',
    question: '{opp} beat you {their}–{my}. Is the dressing room in crisis?',
    weight: 5,
    when: (c) => c.outcome === 'L',
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Calm the storm', quote: '“No crisis. We analyse {opp}, we learn, we move on.”', morale: 0, rep: { coachTrust: 3, mediaHeat: -3 } },
      { id: 'bold', style: 'bold', label: 'Fire up the group', quote: '“Crisis? Come to training on Monday. We’ll answer in the next match.”', morale: 2, rep: { fanPopularity: 3, mediaHeat: 5, lockerRoom: 1 } },
      { id: 'humble', style: 'humble', label: 'Own it', quote: '“We were not good enough. I include myself in that.”', morale: -2, rep: { lockerRoom: 3, fanPopularity: 2, coachTrust: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'streak-w',
    reporter: 'Théo Marchal',
    outlet: 'RMC Sport',
    question: 'Three wins in a row now. Can we start calling you contenders?',
    weight: 5,
    when: (c) => c.recent.length >= 3 && c.recent.slice(-3).every((r) => r === 'W'),
    answers: [
      { id: 'tactical', style: 'tactical', label: 'One game at a time', quote: '“We take it match by match. Nothing is won yet.”', morale: 2, rep: { coachTrust: 3, mediaHeat: -2 } },
      { id: 'bold', style: 'bold', label: 'Embrace the label', quote: '“Call us whatever you like. We’re building something big.”', morale: 5, rep: { fanPopularity: 5, mediaHeat: 6, lockerRoom: 1, coachTrust: -1 } },
      { id: 'humble', style: 'humble', label: 'Thank the fans', quote: '“The support has been incredible. This run is theirs too.”', morale: 3, rep: { fanPopularity: 4, lockerRoom: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'streak-l',
    reporter: 'Victor Lemaire',
    outlet: 'Eurosport',
    question: 'After another poor result, is the manager’s job at risk?',
    weight: 6,
    when: (c) => c.recent.length >= 3 && c.recent.slice(-3).filter((r) => r === 'L').length >= 2,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Back the boss', quote: '“The manager has our full support. The problem is on the pitch.”', morale: 0, rep: { coachTrust: 5, lockerRoom: 2, mediaHeat: -2 } },
      { id: 'bold', style: 'bold', label: 'Demand changes', quote: '“Something needs to change — in the dressing room, in the approach. Everyone knows it.”', morale: -2, rep: { mediaHeat: 8, coachTrust: -6, fanPopularity: 2, lockerRoom: -3 } },
      { id: 'humble', style: 'humble', label: 'Blame the players', quote: '“It’s us, the players. We’re not delivering for him.”', morale: -1, rep: { lockerRoom: 3, coachTrust: 3, fanPopularity: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'goal-vs',
    reporter: 'Salomé Vidal',
    outlet: 'Canal Stadium',
    question: 'Tell us about your goal against {opp} — and that celebration!',
    weight: 5,
    when: (c) => c.goals >= 1,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Credit the move', quote: '“It came from the training ground. The team created it, I just finished.”', morale: 2, rep: { coachTrust: 3, lockerRoom: 2 } },
      { id: 'bold', style: 'bold', label: 'Play to the crowd', quote: '“I told my mates I’d score today. The celebration? Pure joy!”', morale: 4, rep: { fanPopularity: 5, mediaHeat: 4 } },
      { id: 'humble', style: 'humble', label: 'Dedicate it', quote: '“This one is for my family. They believed in me from day one.”', morale: 4, rep: { fanPopularity: 4, lockerRoom: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'quiet-game',
    reporter: 'Karim Benzarti',
    outlet: 'Foot Mercato',
    question: 'A quiet one today, no goals, no assists. Is the pressure of expectations getting to you?',
    weight: 5,
    when: (c) => c.goals === 0 && c.assists === 0 && c.rating < 6.5,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Be honest', quote: '“Some days it doesn’t fall for you. I keep working.”', morale: 0, rep: { coachTrust: 2, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Brush it off', quote: '“Pressure? I thrive on it. Ask me again after the next game.”', morale: 2, rep: { fanPopularity: 2, mediaHeat: 4 } },
      { id: 'humble', style: 'humble', label: 'Take responsibility', quote: '“I need to be better. The team deserves more from me.”', morale: -1, rep: { lockerRoom: 3, coachTrust: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'ambush',
    reporter: 'Didier Cornet',
    outlet: 'La Voix du Foot',
    tone: 'hostile',
    question: 'Sources say you are unhappy in the dressing room and the fans are losing patience. Anything to add?',
    weight: 7,
    when: (c) => c.mood <= -15,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Deny calmly', quote: '“I don’t know your sources. I’m happy here and focused on the work.”', morale: 0, rep: { coachTrust: 2, mediaHeat: -2 } },
      { id: 'bold', style: 'bold', label: 'Attack the press', quote: '“Maybe you should check your sources. Write what really happens on the pitch.”', morale: 2, rep: { fanPopularity: 3, mediaHeat: 7, lockerRoom: 1 } },
      { id: 'humble', style: 'humble', label: 'Reach out', quote: '“If people feel that way, I need to earn their trust again.”', morale: 0, rep: { fanPopularity: 3, lockerRoom: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'fan-favourite',
    reporter: 'Louise Archambault',
    outlet: 'Stade 2 Soir',
    tone: 'friendly',
    question: 'The supporters adore you. If you could say one thing to them tonight, what would it be?',
    weight: 7,
    when: (c) => c.mood >= 15,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Keep believing', quote: '“Keep believing with us. The best is still to come.”', morale: 3, rep: { fanPopularity: 3, coachTrust: 1 } },
      { id: 'bold', style: 'bold', label: 'Promise something', quote: '“I promise you a trophy. I’ll give everything to bring it home.”', morale: 5, rep: { fanPopularity: 6, mediaHeat: 5, coachTrust: -1 } },
      { id: 'humble', style: 'humble', label: 'Thank them', quote: '“Thank you. Without you, nothing is possible.”', morale: 4, rep: { fanPopularity: 5, lockerRoom: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'subbed',
    reporter: 'Luc Martel',
    outlet: 'Canal Stadium',
    question: 'The coach took you off before the end. Did you agree with the decision?',
    weight: 9,
    when: (c) => c.subbedOff,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Accept the call', quote: '“It’s the coach’s decision. I wasn’t at my best and the team needed fresh legs.”', morale: -1, rep: { coachTrust: 4, lockerRoom: 2, mediaHeat: -2 } },
      { id: 'bold', style: 'bold', label: 'Show your anger', quote: '“I was frustrated. I want to play the full ninety minutes every week.”', morale: 1, rep: { mediaHeat: 6, coachTrust: -6, lockerRoom: -3, fanPopularity: 1 } },
      { id: 'humble', style: 'humble', label: 'Own the performance', quote: '“I wasn’t good enough today. I’ll work harder to earn my place back.”', morale: -2, rep: { coachTrust: 3, lockerRoom: 4, fanPopularity: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'benched',
    reporter: 'Inès Carvalho',
    outlet: 'Foot Mercato',
    question: 'You started on the bench again. Are you frustrated with your role?',
    weight: 8,
    when: (c) => c.benched && !c.subbedOff,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Stay professional', quote: '“I’m ready whenever the coach calls. My job is to impact the game from the bench.”', morale: 1, rep: { coachTrust: 4, lockerRoom: 2, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Demand a start', quote: '“I belong in the starting eleven. I’ll keep saying it until it happens.”', morale: 2, rep: { mediaHeat: 6, coachTrust: -5, fanPopularity: 3, lockerRoom: -2 } },
      { id: 'humble', style: 'humble', label: 'Keep working', quote: '“Competition makes everyone better. I’ll keep my head down and keep training.”', morale: 1, rep: { coachTrust: 3, lockerRoom: 3 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'hero',
    reporter: 'Camille Laurent',
    outlet: 'L’Équipe Live',
    question: 'You were the difference-maker today. Are you the player this team is built around?',
    weight: 5,
    when: (c) => c.goals >= 1 || c.rating >= 8,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Credit the system', quote: '“The structure gave me the spaces. Our movement off the ball makes it easy.”', morale: 3, rep: { coachTrust: 4, lockerRoom: 2, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Own the spotlight', quote: '“Yes. Big games need big players, and I want every one of them.”', morale: 6, rep: { fanPopularity: 4, mediaHeat: 6, lockerRoom: -3, coachTrust: -1 } },
      { id: 'humble', style: 'humble', label: 'Stay humble', quote: '“I just do my job. The lads deserve the headlines, not me.”', morale: 4, rep: { lockerRoom: 4, fanPopularity: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'defeat',
    reporter: 'Marcus Webb',
    outlet: 'Sky Football Desk',
    question: 'A heavy defeat. What went wrong out there and who is responsible?',
    weight: 6,
    when: (c) => c.outcome === 'L',
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Own the tactics', quote: '“We lost the midfield battle and didn’t adapt quickly enough. We’ll fix it on the training pitch.”', morale: -1, rep: { coachTrust: 4, mediaHeat: -2, lockerRoom: 2 } },
      { id: 'bold', style: 'bold', label: 'Call out the team', quote: '“Frankly, the standards weren’t good enough. Some people need to look in the mirror.”', morale: -4, rep: { mediaHeat: 7, lockerRoom: -6, fanPopularity: 2, coachTrust: -2 } },
      { id: 'humble', style: 'humble', label: 'Take the blame', quote: '“I should have done more. I’ll answer on the pitch next time.”', morale: -2, rep: { fanPopularity: 3, lockerRoom: 3, coachTrust: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'win',
    reporter: 'Isabel Moreno',
    outlet: 'DAZN Touchline',
    question: 'Another win — is the dressing room starting to believe something special is building?',
    weight: 4,
    when: (c) => c.outcome === 'W',
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Stay measured', quote: '“It’s about the next match. We keep to our routines and keep improving the details.”', morale: 2, rep: { coachTrust: 3, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Talk title', quote: '“Yes — and we’re not hiding it. We’re here to win trophies.”', morale: 5, rep: { fanPopularity: 4, mediaHeat: 5, lockerRoom: 1, coachTrust: -1 } },
      { id: 'humble', style: 'humble', label: 'Praise the fans', quote: '“The supporters carry us. This one is for them.”', morale: 4, rep: { fanPopularity: 5, lockerRoom: 1 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'penalty',
    reporter: 'Jonas Becker',
    outlet: 'Kicker Magazin',
    question: 'You stepped up from the spot under enormous pressure. What was going through your mind?',
    weight: 7,
    when: (c) => c.missedKick,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Talk the process', quote: '“I picked my corner early and committed. Sometimes the keeper wins that duel.”', morale: 1, rep: { coachTrust: 2, mediaHeat: -2 } },
      { id: 'bold', style: 'bold', label: 'Shrug it off', quote: '“Penalties are 50/50. Give me the ball again tomorrow, I’ll take it again.”', morale: 3, rep: { fanPopularity: 3, mediaHeat: 4, lockerRoom: -1 } },
      { id: 'humble', style: 'humble', label: 'Apologise', quote: '“I let everyone down. I’m sorry to my teammates and the fans.”', morale: -3, rep: { lockerRoom: 4, fanPopularity: 2, mediaHeat: -1 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'transfer',
    reporter: 'Fabrizio Rinaldi',
    outlet: 'Transfer Window Pod',
    question: 'Big clubs are circling. Is your future still here, or is a summer move inevitable?',
    weight: 4,
    when: (c) => c.mediaHeat >= 35,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Deflect to the agent', quote: '“My agent handles that. My job is to perform for this club.”', morale: 0, rep: { coachTrust: 2, mediaHeat: -3 } },
      { id: 'bold', style: 'bold', label: 'Keep doors open', quote: '“I’m ambitious. I want the biggest stage possible — let’s see who calls.”', morale: 3, rep: { mediaHeat: 8, fanPopularity: -3, coachTrust: -4, lockerRoom: -2 } },
      { id: 'humble', style: 'humble', label: 'Pledge loyalty', quote: '“I’m happy here. This is a club where I feel at home.”', morale: 2, rep: { fanPopularity: 5, coachTrust: 3, mediaHeat: -2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'manager',
    reporter: 'Hélène Girard',
    outlet: 'RMC Sport',
    question: 'Reports suggest tension between you and the manager over your role. Is that true?',
    weight: 4,
    when: (c) => c.coachTrust <= 45,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Dismiss it', quote: '“Everything is fine. We talk daily — the gaffer pushes everyone, that’s his job.”', morale: 1, rep: { coachTrust: 3, mediaHeat: -3 } },
      { id: 'bold', style: 'bold', label: 'Demand more minutes', quote: '“I want to play more, no secret there. I believe I’m ready.”', morale: 2, rep: { mediaHeat: 6, coachTrust: -6, fanPopularity: 3, lockerRoom: -2 } },
      { id: 'humble', style: 'humble', label: 'Back the manager', quote: '“I respect the boss. I’ll earn every minute.”', morale: 0, rep: { coachTrust: 5, lockerRoom: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'draw',
    reporter: 'Paulo Ribeiro',
    outlet: 'GloboEsporte',
    question: 'Two points dropped today. Is it a point gained or two points lost?',
    weight: 5,
    when: (c) => c.outcome === 'D',
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Be pragmatic', quote: '“A point away from home is never bad. We keep our shape and keep growing.”', morale: 1, rep: { coachTrust: 3, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Show frustration', quote: '“Two points lost. We had chances to kill it and didn’t.”', morale: -1, rep: { fanPopularity: 2, mediaHeat: 3, lockerRoom: -2 } },
      { id: 'humble', style: 'humble', label: 'Stay positive', quote: '“We’ll take the positives and go again.”', morale: 2, rep: { lockerRoom: 3, fanPopularity: 1 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'form',
    reporter: 'Tom Holloway',
    outlet: 'The Athletic',
    question: 'Your numbers this season are turning heads. Is a national-team spot the next target?',
    weight: 3,
    when: (c) => c.rating >= 7 && c.mediaHeat >= 20,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Focus on club', quote: '“If I keep performing for my club, the rest takes care of itself.”', morale: 2, rep: { coachTrust: 3, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Make it a goal', quote: '“Absolutely. Playing for my country is my biggest dream and I’m coming for it.”', morale: 5, rep: { fanPopularity: 4, mediaHeat: 4 } },
      { id: 'humble', style: 'humble', label: 'Leave it to the coach', quote: '“That’s the national coach’s decision. I’m just enjoying my football.”', morale: 2, rep: { lockerRoom: 2, fanPopularity: 2 } },
      NO_COMMENT,
    ],
  },
  {
    id: 'generic',
    reporter: 'Ana Duarte',
    outlet: 'Eurosport',
    question: 'Quick thoughts on the performance and what the team takes from it?',
    weight: 1,
    when: () => true,
    answers: [
      { id: 'tactical', style: 'tactical', label: 'Analyse it', quote: '“We were compact between the lines and our pressing triggers worked well.”', morale: 2, rep: { coachTrust: 3, mediaHeat: -1 } },
      { id: 'bold', style: 'bold', label: 'Make a statement', quote: '“We’re a team on the rise. People should start paying attention.”', morale: 3, rep: { mediaHeat: 4, fanPopularity: 2, lockerRoom: -1 } },
      { id: 'humble', style: 'humble', label: 'Keep it simple', quote: '“Proud of the group. Back to work tomorrow.”', morale: 2, rep: { lockerRoom: 3 } },
      NO_COMMENT,
    ],
  },
];

/** A second question: the journalist reacts to the style of your first answer. */
export interface FollowUp {
  id: string;
  question: string;
  answers: PressAnswer[];
}

const FU = (id: string, style: PressStyle, label: string, quote: string, morale: number, rep: Partial<Reputation>): PressAnswer => ({ id, style, label, quote, morale, rep });

export const FOLLOW_UPS: Record<PressStyle, FollowUp[]> = {
  tactical: [
    {
      id: 'fu-heart',
      question: 'Very measured. But do the fans ever get to hear what you really feel?',
      answers: [
        FU('a', 'humble', 'Open up', '“Honestly? I live for these nights. The emotion is real.”', 2, { fanPopularity: 3, lockerRoom: 1 }),
        FU('b', 'tactical', 'Stay professional', '“Emotion belongs on the pitch. Words come later.”', 1, { coachTrust: 2 }),
        FU('c', 'bold', 'Tease them', '“Wait for the end of the season. Then you’ll hear everything.”', 2, { mediaHeat: 4, fanPopularity: 1 }),
      ],
    },
    {
      id: 'fu-system',
      question: 'You always praise the system. Is there a player who has been carrying it?',
      answers: [
        FU('a', 'humble', 'Name a teammate', '“Our captain. He doesn’t get enough credit.”', 2, { lockerRoom: 4, coachTrust: 1 }),
        FU('b', 'tactical', 'Say the group', '“It’s the group, always the group.”', 1, { lockerRoom: 2 }),
        FU('c', 'bold', 'Take the compliment', '“Fine, a bit of me too. I’m not going to lie.”', 2, { mediaHeat: 4, fanPopularity: 2, lockerRoom: -2 }),
      ],
    },
  ],
  deflect: [
    {
      id: 'fu-dodge',
      question: 'You keep dodging the question. Is there something we should know?',
      answers: [
        FU('a', 'humble', 'Be straight', '“No secrets. I just prefer to keep things private.”', 0, { coachTrust: 1, mediaHeat: -1 }),
        FU('b', 'bold', 'Push back', '“If there was news, I would tell you. Next question.”', 1, { mediaHeat: 3 }),
        FU('c', 'tactical', 'Smile and move on', '“All good. Thank you.”', 0, { mediaHeat: -1 }),
      ],
    },
  ],
  bold: [
    {
      id: 'fu-pressure',
      question: 'That’s a big statement. Aren’t you putting enormous pressure on yourself?',
      answers: [
        FU('a', 'bold', 'Double down', '“Pressure is a privilege. I want it every week.”', 3, { fanPopularity: 3, mediaHeat: 5, lockerRoom: -1 }),
        FU('b', 'tactical', 'Clarify', '“Let me be clear: I meant the whole team, not just me.”', 1, { lockerRoom: 3, coachTrust: 2 }),
        FU('c', 'humble', 'Laugh it off', '“Maybe I got carried away! I’ll let the football talk.”', 1, { fanPopularity: 2, mediaHeat: -2 }),
      ],
    },
    {
      id: 'fu-teammates',
      question: 'Some teammates may not like that tone. What would you say to them?',
      answers: [
        FU('a', 'humble', 'Reach out', '“I’ll talk to them. We’re in this together.”', 1, { lockerRoom: 4 }),
        FU('b', 'bold', 'Stand your ground', '“If it bothers them, they can answer on the pitch too.”', 2, { mediaHeat: 4, lockerRoom: -4, fanPopularity: 2 }),
        FU('c', 'tactical', 'Defuse it', '“It was said with passion. Everyone in the group understands.”', 1, { lockerRoom: 2, coachTrust: 1 }),
      ],
    },
  ],
  humble: [
    {
      id: 'fu-credit',
      question: 'You always deflect praise. Do you ever give yourself credit?',
      answers: [
        FU('a', 'humble', 'Stay modest', '“Credit belongs to the people who work behind the scenes.”', 1, { lockerRoom: 3, fanPopularity: 2 }),
        FU('b', 'bold', 'Accept it', '“Alright — I’m proud of the work I’ve put in. It’s been tough.”', 2, { fanPopularity: 3, mediaHeat: 3 }),
        FU('c', 'tactical', 'Turn it back', '“Credit is a reason to work harder, not to celebrate.”', 1, { coachTrust: 3 }),
      ],
    },
  ],
  'no-comment': [
    {
      id: 'fu-silence',
      question: 'Silence says a lot. Are you hiding something?',
      answers: [
        FU('a', 'tactical', 'Explain yourself', '“No. I simply prefer to speak when I have something worth saying.”', 0, { coachTrust: 1, mediaHeat: -2 }),
        FU('b', 'bold', 'Stay cryptic', '“You’ll find out soon enough.”', 1, { mediaHeat: 6, fanPopularity: 1, coachTrust: -1 }),
        FU('c', 'humble', 'Apologise', '“Sorry — I’m just tired. It was a long match.”', 0, { fanPopularity: 2, mediaHeat: -1 }),
      ],
    },
  ],
};

/** The journalist's reaction to your answer, before the next question. */
export const REACTIONS: Record<PressStyle, string[]> = {
  tactical: ['Very measured, as always.', 'A careful answer.'],
  deflect: ['You’re keeping your cards close.', 'Diplomatic.'],
  bold: ['Now that is a headline!', 'Bold words.'],
  humble: ['Always so modest.', 'Refreshing honesty.'],
  'no-comment': ['Hmm. Nothing to say?', 'The silence speaks.'],
};

/** The paper speaks for you now: what the headlines do to your standing, from how you played. */
export function paperEffect(c: Pick<PressContext, 'rating' | 'goals' | 'missedKick' | 'subbedOff' | 'sentOff'>): PressAnswer {
  const great = c.rating >= 7.5 || c.goals >= 2;
  const good = c.rating >= 6.5 || c.goals >= 1;
  const poor = c.rating < 5.8 || c.subbedOff || c.missedKick || c.sentOff;
  const rep: Partial<Reputation> = great ? { fanPopularity: 3, mediaHeat: 3 } : good ? { fanPopularity: 1, mediaHeat: 1 } : poor ? { fanPopularity: -1, mediaHeat: 2, coachTrust: -1 } : {};
  return { id: 'paper', style: 'tactical', label: 'The papers', quote: '', morale: great ? 3 : good ? 1 : poor ? -2 : 0, rep };
}
