import type { Brief, Expectation, Reputation } from '../types';

/** What a pre-match choice changes once it is made (the dressing room builds one from the talk you had). */
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
}

/** The pre-match moment: the scouting report on the opponent, and the boost to take into the match. */
export const TRAINING_RITUAL: Ritual = { id: 'training', emoji: '👀', title: 'Match-day briefing' };
