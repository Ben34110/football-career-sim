import type { Player, Upgrades } from '../types';

export type UpgradeId = keyof Upgrades;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** What each level adds, in order */
  levels: [string, string, string];
  /** Price per level as a multiple of the current weekly wage */
  weeks: [number, number, number];
}

export const MAX_UPGRADE_LEVEL = 3;

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'coach',
    name: 'Personal coach',
    levels: ['+25% performance XP', '+50% performance XP', '+75% performance XP'],
    weeks: [8, 20, 45],
  },
  {
    id: 'nutrition',
    name: 'Nutritionist & sleep plan',
    levels: ['Ignore 1 life of fatigue', 'Ignore 2 lives of fatigue', 'Ignore 3 lives of fatigue'],
    weeks: [8, 20, 44],
  },
  {
    id: 'pr',
    name: 'Media advisor',
    levels: ['−15% scandal risk · better reactions', '−30% scandal risk · better reactions', '−45% scandal risk · better reactions'],
    weeks: [6, 16, 36],
  },
  {
    id: 'agent',
    name: 'Top-tier agent',
    levels: ['+4% wages · easier approaches', '+8% wages · easier approaches', '+12% wages · easier approaches'],
    weeks: [10, 24, 50],
  },
];

export const levelOf = (p: Pick<Player, 'upgrades'>, id: UpgradeId) => p.upgrades?.[id] ?? 0;

/** Price (€K) of the next level of an upgrade; scales with how much you earn. */
export function upgradeCost(def: UpgradeDef, level: number, wage: number): number | null {
  if (level >= MAX_UPGRADE_LEVEL) return null;
  return Math.max(6, Math.round(Math.max(wage, 3) * def.weeks[level]));
}

/** Charity gala: once per season, builds goodwill. */
export const galaCost = (wage: number) => Math.max(10, Math.round(Math.max(wage, 3) * 6));
