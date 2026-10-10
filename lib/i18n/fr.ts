import { FR_MATCH } from './fr-match';
import { FR_MOMENTS } from './fr-moments';
import { FR_PAPER } from './fr-paper';
import { FR_RITUALS } from './fr-rituals';
import { FR_SCANDALS } from './fr-scandals';
import { FR_SPEECHES } from './fr-speeches';
import { FR_TALKS } from './fr-talks';
import { FR_UI } from './fr-ui';
import { WORLD } from '../data/world';

/** Exact-string dictionary (English → French). */
export const FR: Record<string, string> = {
  ...FR_UI,
  ...FR_SPEECHES,
  ...FR_MATCH,
  ...FR_SCANDALS,
  ...FR_MOMENTS,
  ...FR_TALKS,
  ...FR_RITUALS,
  ...FR_PAPER,
  // every country name, straight from the world table
  ...Object.fromEntries(WORLD.map((w) => [w.name, w.fr])),
};

/**
 * Strings that are stored already interpolated (fixture labels, trophies, offer notes…)
 * can't be looked up verbatim, so they are matched by shape.
 */
export const FR_PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^Matchday (\d+)$/, (m) => `Journée ${m[1]}`],
  // European competitions: fixture labels and trophies
  [/^(Champions League|Europa League) Group Match (\d)$/, (m) => `${FR[m[1]]} · Match de poule ${m[2]}`],
  [/^(Champions League|Europa League) (Round of 16|Quarter-Final|Semi-Final|Final)$/, (m) => `${FR[m[1]]} · ${FR[m[2]] ?? m[2]}`],
  [/^(Champions League|Europa League) (\d{4}\/\d{2})$/, (m) => `${FR[m[1]]} ${m[2]}`],
  [/^Domestic Cup (.+)$/, (m) => `Coupe nationale ${m[1]}`],
  [/^League Title (.+)$/, (m) => `Titre de champion ${m[1]}`],
  [/^Ballon d’Or (.+)$/, (m) => `Ballon d’Or ${m[1]}`],
  // "<tournament> 2027"
  [/^(.+) (\d{4})$/, (m) => (FR[m[1]] ? `${FR[m[1]]} ${m[2]}` : m[0])],
  [/^(.+) see you as a marquee signing\.$/, (m) => `${m[1]} te voit comme une recrue phare.`],
  [/^(.+) see you as a first-team starter\.$/, (m) => `${m[1]} te voit comme un titulaire.`],
  [/^(.+) see you as a rotation option\.$/, (m) => `${m[1]} te voit comme une option de rotation.`],
  [/^(.+) want to build around you\.$/, (m) => `${m[1]} veut construire son équipe autour de toi.`],
  // youth national teams: "Brazil U20"
  [/^(.+) (U20|U23)$/, (m) => (FR[m[1]] ? `${FR[m[1]]} ${m[2]}` : m[0])],
  [/^Kick (\d+)$/, (m) => `Tir ${m[1]}`],
];
