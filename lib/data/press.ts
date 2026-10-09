import type { Outcome, Reputation } from '../types';

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
}

export interface PressQuestion {
  id: string;
  reporter: string;
  outlet: string;
  question: string;
  when: (c: PressContext) => boolean;
  answers: PressAnswer[];
  weight: number;
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
