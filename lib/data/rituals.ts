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

/** The pre-match moment: you read the dressing room, then say the right thing to the right teammate. */
export const ROOM_RITUAL: Ritual = { id: 'room', emoji: '🗣️', title: 'The dressing room' };
