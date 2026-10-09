import { FR_MATCH } from './fr-match';
import { FR_SCANDALS } from './fr-scandals';
import { FR_SPEECHES } from './fr-speeches';
import { FR_UI } from './fr-ui';
import { WORLD } from '../data/world';

/** Exact-string dictionary (English → French). */
export const FR: Record<string, string> = {
  ...FR_UI,
  ...FR_SPEECHES,
  ...FR_MATCH,
  ...FR_SCANDALS,
  // every country name, straight from the world table
  ...Object.fromEntries(WORLD.map((w) => [w.name, w.fr])),
};

/**
 * Strings that are stored already interpolated (fixture labels, trophies, offer notes…)
 * can't be looked up verbatim, so they are matched by shape.
 */
export const FR_PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^Matchday (\d+)$/, (m) => `Journée ${m[1]}`],
  [/^Domestic Cup (.+)$/, (m) => `Coupe nationale ${m[1]}`],
  [/^League Title (.+)$/, (m) => `Titre de champion ${m[1]}`],
  [/^Ballon d’Or (.+)$/, (m) => `Ballon d’Or ${m[1]}`],
  // "<tournament> 2027"
  [/^(.+) (\d{4})$/, (m) => (FR[m[1]] ? `${FR[m[1]]} ${m[2]}` : m[0])],
  [/^(.+) see you as a marquee signing\.$/, (m) => `${m[1]} te voit comme une recrue phare.`],
  [/^(.+) see you as a first-team starter\.$/, (m) => `${m[1]} te voit comme un titulaire.`],
  [/^(.+) see you as a rotation option\.$/, (m) => `${m[1]} te voit comme une option de rotation.`],
  [/^(.+) want to build around you\.$/, (m) => `${m[1]} veut construire son équipe autour de toi.`],
  [/^Kick (\d+)$/, (m) => `Tir ${m[1]}`],
];
