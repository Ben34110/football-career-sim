import { translate } from '../i18n';

export const AMBIENT = {
  myChance: [
    '{me} swing in a dangerous cross — it just evades everyone.',
    '{me} work a slick one-two and fire a shot in.',
    'A thunderous effort from {me} flashes past the post!',
    '{me} press high and win it back in a dangerous area.',
    '{me} are camped in the final third now.',
  ],
  oppChance: [
    '{opp} break forward — a shot whistles wide.',
    '{opp} carve out an opening through the middle.',
    'Dangerous set-piece from {opp}, scrambled clear.',
    '{opp} ping it around and test the keeper.',
  ],
  mySave: ['{opp}’s keeper makes a sharp stop.', '{opp}’s keeper tips it round the post.', 'Brilliant block from {opp}’s defence.'],
  oppSave: ['Our keeper gets down well to push it away.', 'A last-ditch block saves us!', 'The woodwork rescues us!'],
  foul: ['A scrappy challenge in midfield — free kick.', 'The referee has a quiet word with both captains.', 'Heated moment on the touchline.'],
  card: ['{who} goes into the book for a late challenge.', '{who} sees yellow for dissent.'],
};

/** Translates the template, then fills the placeholders. */
export const fill = (tpl: string, vars: Record<string, string>) => translate(tpl, vars);
