import { getClub } from '../data/clubs';
import type { Player, SeasonRecord } from '../types';
import { ovrOf } from './player';

export type SquadStatusId = 'free' | 'newcomer' | 'marquee' | 'prospect' | 'rotation' | 'starter' | 'key' | 'star' | 'captain' | 'legend';

export interface StatusGoal {
  id: 'influence' | 'seasons' | 'room' | 'fans';
  value: number;
  target: number;
  ok: boolean;
}

export interface SquadStatus {
  id: SquadStatusId;
  /** 0–100: how much weight you carry at the club */
  influence: number;
  /** Seasons at the current club, this one included */
  seasons: number;
  /** The parts of the influence, 0–100 each */
  parts: { skill: number; trust: number; room: number; fans: number; tenure: number };
  /** What the next role asks for */
  next: { id: SquadStatusId; goals: StatusGoal[] } | null;
}

/** The roles you can climb through, from the bench to the armband. */
const LADDER: SquadStatusId[] = ['rotation', 'starter', 'key', 'star', 'captain', 'legend'];

/** What each role of the ladder asks for. */
const NEEDS: Record<string, { influence: number; seasons?: number; room?: number; fans?: number }> = {
  starter: { influence: 42 },
  key: { influence: 58, seasons: 2 },
  star: { influence: 72 },
  captain: { influence: 74, seasons: 3, room: 55 },
  legend: { influence: 80, seasons: 6, fans: 65 },
};

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/** Consecutive seasons at the current club, this one included. */
export const seasonsAtClub = (clubId: string | null, history: SeasonRecord[]) => {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && history[i].clubId === clubId; i--) n++;
  return n + 1;
};

/** Your place in the dressing room: how good you are compared with the squad, how much the coach, the players and the fans rate you, and how long you have been there. */
export function squadStatus(player: Player, history: SeasonRecord[]): SquadStatus {
  const club = getClub(player.clubId);
  const seasons = seasonsAtClub(player.clubId, history);
  const parts = {
    skill: clamp(50 + (ovrOf(player) - (club?.strength ?? 60)) * 3.5),
    trust: clamp(player.rep.coachTrust),
    room: clamp(player.rep.lockerRoom),
    fans: clamp(player.rep.fanPopularity),
    tenure: clamp(seasons * 18),
  };
  const influence = Math.round(parts.skill * 0.4 + parts.trust * 0.22 + parts.room * 0.14 + parts.fans * 0.12 + parts.tenure * 0.12);

  let id: SquadStatusId;
  if (!club) id = 'free';
  else if (influence >= 80 && seasons >= 6 && parts.fans >= 65) id = 'legend';
  else if (influence >= 74 && seasons >= 3 && parts.room >= 55 && player.age >= 22) id = 'captain';
  else if (seasons <= 1 && influence < 72) id = player.age <= 20 ? 'prospect' : 'newcomer';
  else if (seasons <= 1) id = 'marquee';
  else if (player.age <= 20 && influence < 58) id = 'prospect';
  else if (influence >= 72) id = 'star';
  else if (influence >= 58) id = 'key';
  else if (influence >= 42) id = 'starter';
  else id = 'rotation';

  // the next step up the ladder
  const rank = LADDER.indexOf(id);
  const nextId = id === 'legend' || id === 'free' ? null : LADDER[Math.max(rank + 1, 1)];
  const need = nextId ? NEEDS[nextId] : null;
  const next = nextId && need
    ? {
        id: nextId,
        goals: [
          { id: 'influence' as const, value: influence, target: need.influence, ok: influence >= need.influence },
          ...(need.seasons ? [{ id: 'seasons' as const, value: seasons, target: need.seasons, ok: seasons >= need.seasons }] : []),
          ...(need.room ? [{ id: 'room' as const, value: Math.round(parts.room), target: need.room, ok: parts.room >= need.room }] : []),
          ...(need.fans ? [{ id: 'fans' as const, value: Math.round(parts.fans), target: need.fans, ok: parts.fans >= need.fans }] : []),
        ],
      }
    : null;
  return { id, influence, seasons, parts, next };
}
