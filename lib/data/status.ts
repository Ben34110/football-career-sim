import type { SquadStatusId } from '../engine/status';

/** The names of the roles, in English (translated where they are shown). */
export const STATUS_LABEL: Record<SquadStatusId, string> = {
  free: 'Free agent',
  newcomer: 'Newcomer',
  marquee: 'Marquee signing',
  prospect: 'Young prospect',
  rotation: 'Squad player',
  starter: 'Regular starter',
  key: 'Key player',
  star: 'Star of the team',
  captain: 'Captain',
  legend: 'Club legend',
};
