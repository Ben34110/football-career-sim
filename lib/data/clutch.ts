import type { ClutchMoment } from '../types';

export type ClutchTemplate = Omit<ClutchMoment, 'minute'> & { weight: number };

export const CLUTCH_DECK: ClutchTemplate[] = [
  {
    id: 'one-v-one',
    weight: 3,
    title: 'One-on-One!',
    setup: 'A killer through ball splits the defence. It’s just you and the keeper.',
    options: [
      { id: 'place', label: 'Place it low', hint: 'Side-foot into the corner', risk: 'Safe', attr: 'finishing', base: 0.58, onSuccess: 'goal', successText: 'calmly slots it into the bottom corner', failText: 'sees it smothered by the keeper' },
      { id: 'chip', label: 'Chip the keeper', hint: 'Audacious panenka-style lob', risk: 'Bold', attr: 'composure', base: 0.4, onSuccess: 'goal', successText: 'lifts it over the diving keeper with ice-cold composure', failText: 'tries to chip it but the keeper stands tall' },
      { id: 'square', label: 'Square it across', hint: 'Unselfish pass to an open teammate', risk: 'Balanced', attr: 'vision', base: 0.6, onSuccess: 'assist', successText: 'squares it perfectly for a tap-in', failText: 'squares it but the cover slides in to clear' },
    ],
  },
  {
    id: 'edge-box',
    weight: 3,
    title: 'Edge of the Box',
    setup: 'The ball drops loose twenty yards out. The goal is begging to be tested.',
    options: [
      { id: 'curl', label: 'Curl it top bins', hint: 'Whip it over the wall of bodies', risk: 'Bold', attr: 'finishing', base: 0.36, onSuccess: 'goal', successText: 'bends a stunning effort into the top corner', failText: 'curls it just over the bar' },
      { id: 'drive', label: 'Drive it low', hint: 'Power through traffic', risk: 'Balanced', attr: 'finishing', base: 0.48, onSuccess: 'goal', successText: 'rifles a low drive past the keeper', failText: 'hits it straight at the keeper' },
      { id: 'layoff', label: 'Lay it off', hint: 'Keep possession, shift momentum', risk: 'Safe', attr: 'vision', base: 0.72, onSuccess: 'momentum', successText: 'lays it off smartly and the team surges forward', failText: 'sees the layoff intercepted' },
    ],
  },
  {
    id: 'counter',
    weight: 3,
    title: '3 v 2 Counter',
    setup: 'You win the ball in your half and break. Two defenders, two runners alongside you.',
    options: [
      { id: 'shoot', label: 'Shoot early', hint: 'Catch the keeper off guard', risk: 'Balanced', attr: 'finishing', base: 0.46, onSuccess: 'goal', successText: 'hits it first time and beats the keeper', failText: 'sees the early shot blocked' },
      { id: 'release', label: 'Release the winger', hint: 'Slide it into his stride', risk: 'Safe', attr: 'vision', base: 0.6, onSuccess: 'assist', successText: 'threads the pass and the winger finishes', failText: 'overhits the pass out of play' },
      { id: 'dribble', label: 'Take on the last man', hint: 'Skin him and go alone', risk: 'Bold', attr: 'composure', base: 0.38, onSuccess: 'goal', successText: 'dances past the defender and scores', failText: 'loses the ball to a sliding tackle' },
    ],
  },
  {
    id: 'box-contact',
    weight: 3,
    title: 'Contact in the Box',
    setup: 'A defender stumbles into your heels inside the area. The referee hesitates.',
    options: [
      { id: 'stay', label: 'Stay up & shoot', hint: 'Fight through the contact', risk: 'Balanced', attr: 'finishing', base: 0.44, onSuccess: 'goal', successText: 'stays on his feet and fires home', failText: 'is unbalanced and shoots wide' },
      { id: 'appeal', label: 'Go down — appeal', hint: 'Win the penalty (the ref decides)', risk: 'Bold', attr: 'composure', base: 0.5, onSuccess: 'kick-penalty', successText: 'goes down and the referee points to the spot', failText: 'goes down — the referee waves play on and books him for simulation' },
      { id: 'pass', label: 'Play it across', hint: 'Find the free man', risk: 'Safe', attr: 'vision', base: 0.6, onSuccess: 'assist', successText: 'cuts it back for a simple finish', failText: 'sees the pass blocked' },
    ],
  },
  {
    id: 'free-kick',
    weight: 4,
    title: 'Free Kick — 22 Yards',
    setup: 'The referee blows. The ball is placed. The captain nods your way.',
    options: [
      { id: 'step-up', label: 'Step up yourself', hint: 'Choose your zone in the 8-zone goal', risk: 'Bold', attr: 'composure', base: 1, onSuccess: 'kick-freekick', successText: 'places the ball and takes a long breath', failText: '' },
      { id: 'cross', label: 'Whip it to the box', hint: 'Look for a runner', risk: 'Balanced', attr: 'vision', base: 0.46, onSuccess: 'assist', successText: 'whips it in and a teammate heads home', failText: 'finds only the first defender' },
      { id: 'short', label: 'Play it short', hint: 'Work an overload', risk: 'Safe', attr: 'vision', base: 0.74, onSuccess: 'momentum', successText: 'plays it short and the team keeps pressing', failText: 'sees the short ball intercepted' },
    ],
  },
  {
    id: 'penalty-award',
    weight: 3,
    title: 'Penalty!',
    setup: 'The referee points to the spot. Every eye in the stadium turns to you.',
    options: [
      { id: 'take', label: 'Take it yourself', hint: 'Pick your zone in the 8-zone goal', risk: 'Bold', attr: 'composure', base: 1, onSuccess: 'kick-penalty', successText: 'grabs the ball and walks to the spot', failText: '' },
      { id: 'captain', label: 'Hand it to the captain', hint: 'Let the designated taker go', risk: 'Safe', attr: 'composure', base: 0.72, onSuccess: 'goal', successText: 'hands over the ball and the captain converts', failText: 'sees the captain’s penalty saved' },
      { id: 'trust', label: 'Back a youngster', hint: 'Build locker-room trust', risk: 'Balanced', attr: 'vision', base: 0.64, onSuccess: 'goal', successText: 'hands the ball to the youngster who scores confidently', failText: 'watches the youngster blaze it over' },
    ],
  },
  {
    id: 'cross-in',
    weight: 2,
    title: 'Cross Incoming',
    setup: 'The full-back whips in a dangerous cross towards you at the far post.',
    options: [
      { id: 'near', label: 'Near-post flick', hint: 'Get a touch ahead of the defender', risk: 'Bold', attr: 'finishing', base: 0.38, onSuccess: 'goal', successText: 'flicks it in at the near post', failText: 'misses the flick completely' },
      { id: 'back', label: 'Attack the back post', hint: 'Time the run, head or volley', risk: 'Balanced', attr: 'finishing', base: 0.46, onSuccess: 'goal', successText: 'arrives late to bury the volley', failText: 'sees the volley fly over the bar' },
      { id: 'dummy', label: 'Dummy it', hint: 'Let it run for the next man', risk: 'Safe', attr: 'vision', base: 0.62, onSuccess: 'momentum', successText: 'dummies it and the move keeps flowing', failText: 'dummies it but nobody is there' },
    ],
  },
  {
    id: 'last-push',
    weight: 2,
    title: 'The Crowd Is Roaring',
    setup: 'The tempo is frantic and the match is on a knife-edge. A decisive moment is coming.',
    options: [
      { id: 'demand', label: 'Demand the ball', hint: 'Take the game by the scruff', risk: 'Bold', attr: 'finishing', base: 0.4, onSuccess: 'goal', successText: 'takes the ball, drives forward and scores a stunner', failText: 'forces the issue and loses it' },
      { id: 'press', label: 'Press high', hint: 'Win it back near their box', risk: 'Balanced', attr: 'stamina', base: 0.55, onSuccess: 'momentum', successText: 'wins it back high and the stadium erupts', failText: 'presses but gets bypassed' },
      { id: 'shape', label: 'Hold your shape', hint: 'Control the tempo', risk: 'Safe', attr: 'composure', base: 0.76, onSuccess: 'momentum', successText: 'slows it down and settles the team', failText: 'loses his man and concedes space' },
    ],
  },
  {
    id: 'track-back',
    weight: 2,
    defensive: true,
    title: 'Danger! They Break',
    setup: 'You lose the ball and the opposition sprint into the space you left behind.',
    options: [
      { id: 'sprint', label: 'Sprint back & tackle', hint: 'All-out recovery run', risk: 'Bold', attr: 'stamina', base: 0.56, onSuccess: 'save', successText: 'sprints 50 yards and slides in with a perfect tackle', failText: 'is too late — the break continues' },
      { id: 'foul', label: 'Professional foul', hint: 'Stop the move at any cost', risk: 'Safe', attr: 'composure', base: 0.78, onSuccess: 'save', successText: 'brings him down — yellow card but the danger is over', failText: 'fouls him in a dangerous area' },
      { id: 'track', label: 'Track the runner', hint: 'Force him wide', risk: 'Balanced', attr: 'vision', base: 0.62, onSuccess: 'save', successText: 'reads the run and forces him wide', failText: 'gets the angle wrong' },
    ],
  },
];
