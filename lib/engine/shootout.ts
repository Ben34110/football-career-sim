import type { Rng } from './rng';

export interface ShootKick {
  side: 'me' | 'opp';
  scored: boolean;
  /** Taken by the user's player */
  byPlayer: boolean;
  round: number;
}

export interface ShootoutState {
  kicks: ShootKick[];
  first: 'me' | 'opp';
}

export const startShootout = (rng: Rng): ShootoutState => ({ kicks: [], first: rng() < 0.5 ? 'me' : 'opp' });

export function nextSide(s: ShootoutState): 'me' | 'opp' {
  const even = s.kicks.length % 2 === 0;
  return even ? s.first : s.first === 'me' ? 'opp' : 'me';
}

export const currentRound = (s: ShootoutState) => Math.floor(s.kicks.length / 2) + 1;

/** The player takes rounds 1, 3, 5 and every sudden-death kick. */
export function playerTakesNext(s: ShootoutState): boolean {
  const r = currentRound(s);
  return nextSide(s) === 'me' && (r % 2 === 1 || r > 5);
}

export function tally(s: ShootoutState) {
  const my = s.kicks.filter((k) => k.side === 'me');
  const opp = s.kicks.filter((k) => k.side === 'opp');
  return {
    my: my.filter((k) => k.scored).length,
    opp: opp.filter((k) => k.scored).length,
    myTaken: my.length,
    oppTaken: opp.length,
  };
}

export function winner(s: ShootoutState): 'me' | 'opp' | null {
  const t = tally(s);
  if (t.myTaken >= 5 && t.oppTaken >= 5 && t.myTaken === t.oppTaken) {
    return t.my === t.opp ? null : t.my > t.opp ? 'me' : 'opp';
  }
  if (t.myTaken > 5 || t.oppTaken > 5) return null; // sudden death mid-round
  const myRem = 5 - t.myTaken;
  const oppRem = 5 - t.oppTaken;
  if (t.my > t.opp + oppRem) return 'me';
  if (t.opp > t.my + myRem) return 'opp';
  return null;
}

export function addKick(s: ShootoutState, scored: boolean, byPlayer: boolean): ShootoutState {
  const side = nextSide(s);
  return { ...s, kicks: [...s.kicks, { side, scored, byPlayer, round: currentRound(s) }] };
}
