import type { Expectation } from '../types';
import { clamp, mulberry32, type Rng } from '../engine/rng';
import { surnamesFor } from './surnames';

/**
 * The pre-match scouting report: what the scouts know about the opponent (level, recent form, the players to watch,
 * one weak point and one danger) and what the club expects from you. It is information only — the boosts are what
 * you act on — so every figure here is deterministic for a given fixture: the same report every time you come back.
 */
export type TraitId = 'leaky' | 'slow' | 'tired' | 'counters' | 'physical';
/** Where on the board the trait is shown */
export type Zone = 'def' | 'mid' | 'att';

export interface Trait {
  id: TraitId;
  kind: 'weak' | 'danger';
  label: string;
  /** What the scout says */
  line: string;
  zone: Zone;
  /** The boost that answers it (see data/boosts) */
  boost: 'attack' | 'defence' | 'mental' | 'general';
}

export const TRAITS: Record<TraitId, Trait> = {
  leaky: { id: 'leaky', kind: 'weak', label: 'Leaky at the back', line: 'Their defence gives up chances all game long.', zone: 'def', boost: 'attack' },
  slow: { id: 'slow', kind: 'weak', label: 'Slow to recover', line: 'They are caught out when you break at speed.', zone: 'mid', boost: 'attack' },
  tired: { id: 'tired', kind: 'weak', label: 'Fades late', line: 'Their legs go in the last half hour.', zone: 'mid', boost: 'general' },
  counters: { id: 'counters', kind: 'danger', label: 'Deadly on the break', line: 'Lose the ball cheaply and they punish it.', zone: 'att', boost: 'defence' },
  physical: { id: 'physical', kind: 'danger', label: 'Physical and aggressive', line: 'They will try to run you ragged.', zone: 'mid', boost: 'mental' },
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function scoutReport(seed: string, diff: number): { weak: Trait; danger: Trait } {
  const h = hash(seed);
  const weaks: TraitId[] = ['leaky', 'slow', 'tired'];
  // a stronger side is more likely to be dangerous on the break, a weaker one physical and rough
  const dangers: TraitId[] = diff <= -3 ? ['counters', 'counters', 'physical'] : diff >= 3 ? ['physical', 'physical', 'counters'] : ['counters', 'physical'];
  return { weak: TRAITS[weaks[h % weaks.length]], danger: TRAITS[dangers[(h >>> 8) % dangers.length]] };
}

/* ───────────── Recent form ───────────── */

export type FormResult = 'W' | 'D' | 'L';

/** What a table row knows about a side's season so far. */
export interface Record3 {
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

/**
 * The opponent's last five results, oldest first. With a table row, they are drawn from the record the side really has
 * (a side that has won twice cannot show three wins); without one, from its level.
 */
export function recentForm(seed: string, strength: number, record?: Record3): FormResult[] {
  const rng = mulberry32(hash(`${seed}|form`));
  if (record && record.played > 0) {
    const pool: FormResult[] = [
      ...Array<FormResult>(Math.max(0, record.won)).fill('W'),
      ...Array<FormResult>(Math.max(0, record.drawn)).fill('D'),
      ...Array<FormResult>(Math.max(0, record.lost)).fill('L'),
    ];
    return shuffled(pool, rng).slice(0, 5);
  }
  const pWin = clamp(0.22 + (strength - 55) / 90, 0.12, 0.72);
  const pDraw = 0.24;
  return Array.from({ length: 5 }, () => {
    const r = rng();
    return r < pWin ? 'W' : r < pWin + pDraw ? 'D' : 'L';
  });
}

function shuffled<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────────── Players to watch ───────────── */

export interface KeyPlayer {
  name: string;
  pos: string;
  ovr: number;
  role: string;
  /** What to expect from him */
  line: string;
}

/** The three players the scouts single out. The first one is always the man who scores their goals. */
export function keyPlayers(seed: string, strength: number, country: string | null | undefined, danger: TraitId): KeyPlayer[] {
  const pool = surnamesFor(country);
  const h = hash(`${seed}|players`);
  const rng = mulberry32(h);
  const taken = new Set<string>();
  const name = () => {
    for (let i = 0; i < 12; i++) {
      const n = pool[Math.floor(rng() * pool.length)];
      if (!taken.has(n)) {
        taken.add(n);
        return n;
      }
    }
    return pool[0];
  };
  const ovr = (bonus: number) => clamp(Math.round(strength + bonus + rng() * 2), 40, 96);
  const third =
    danger === 'counters'
      ? { pos: 'RW', role: 'Pacy winger', line: 'Lightning on the break: do not leave him space.' }
      : danger === 'physical'
        ? { pos: 'DM', role: 'The enforcer', line: 'Wins every duel and lets you know about it.' }
        : { pos: 'CB', role: 'The captain', line: 'Reads the game: hard to get past.' };
  return [
    { name: name(), pos: 'ST', ovr: ovr(4), role: 'Top scorer', line: 'Their main goal threat: he only needs half a chance.' },
    { name: name(), pos: 'AM', ovr: ovr(2), role: 'Playmaker', line: 'Pulls every string in midfield.' },
    { name: name(), pos: third.pos, ovr: ovr(1), role: third.role, line: third.line },
  ];
}

/* ───────────── What the club expects ───────────── */

export type Stakes = 'favourites' | 'even' | 'underdogs';

export interface Expected {
  stakes: Stakes;
  expectation: Expectation;
  /** Extra on top of the expectation's rating (heavy favourites are expected to be better) */
  target: number;
  /** One-line sketch of the match to come */
  outlook: string;
}

export function expectedOf(diff: number): Expected {
  if (diff >= 6) return { stakes: 'favourites', expectation: 'Standard', target: 0.3, outlook: 'You are the clear favourites: the club expects a win, and a strong performance from you.' };
  if (diff >= 3) return { stakes: 'favourites', expectation: 'Standard', target: 0, outlook: 'You are the favourites: the club expects a win and a steady performance.' };
  if (diff <= -5) return { stakes: 'underdogs', expectation: 'Modest', target: 0, outlook: 'You are the underdogs: nobody expects much, so any good moment is a bonus.' };
  if (diff <= -3) return { stakes: 'underdogs', expectation: 'Modest', target: 0, outlook: 'A tough one on paper: the club will settle for a solid shift.' };
  return { stakes: 'even', expectation: 'Standard', target: 0, outlook: 'An even match: the little details will decide it.' };
}

/** Everything the report needs, built once. */
export function buildScouting(input: { seed: string; oppStrength: number; myStrength: number; country?: string | null; record?: Record3 }) {
  const diff = input.myStrength - input.oppStrength;
  const report = scoutReport(`${input.seed}|${input.oppStrength}`, diff);
  return {
    diff,
    report,
    form: recentForm(input.seed, input.oppStrength, input.record),
    players: keyPlayers(input.seed, input.oppStrength, input.country, report.danger.id),
    expected: expectedOf(diff),
    /** The boosts the report points to (the weak point to exploit, the danger to defuse) */
    recommended: Array.from(new Set([report.weak.boost, report.danger.boost])),
  };
}
