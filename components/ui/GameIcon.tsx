import {
  ArrowDown, ArrowUp, Axe, BarChart3, Baby, BicepsFlexed, BrickWall, CheckCircle2, CircleHelp, ClipboardList, Clover, Compass, DoorOpen, Dices, Drum, Eye, Flag, Flame, Footprints, Glasses, Globe, Hand, Handshake, Headphones, Heart, HeartCrack, Medal, Megaphone, Music, PenLine, Repeat, Scale, Shield, Shirt, Snowflake, Sparkles, Star, Swords, Target, TrendingDown, TrendingUp, Trophy, Utensils, Volume2, VolumeX, Vote, Wind, Zap, Brain,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';

/** Every symbol the game data used to write as an emoji, and the open-source icon that replaces it. */
/** A football, drawn here (Lucide has none): a circle, the black pentagon and the seams. */
export function SoccerBall({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.4L16.4 10.6L14.7 15.8H9.3L7.6 10.6Z" fill="currentColor" />
      <path d="M12 7.4V2.3M16.4 10.6L21.2 9M14.7 15.8L17.7 19.9M9.3 15.8L6.3 19.9M7.6 10.6L2.8 9" />
    </svg>
  );
}

export const EMOJI_ICON: Record<string, ComponentType<{ className?: string }>> = {
  '⚡': Zap, '⚽': SoccerBall, '✅': CheckCircle2, '❤': Heart, '🎖': Medal, '🎧': Headphones, '🎯': Target, '🎷': Music, '👀': Eye, '👶': Baby,
  '🔇': VolumeX, '🔥': Flame, '🔮': Sparkles, '🗣': Megaphone, '🗳': Vote, '😎': Glasses, '🙏': Hand, '🚪': DoorOpen, '🛡': Shield, '🤝': Handshake,
  '🤷': CircleHelp, '🥁': Drum, '🧊': Snowflake, '🧠': Brain, '🧤': Hand, '🧱': BrickWall, '🪞': Sparkles, '🍝': Utensils, '👟': Footprints, '🔊': Volume2,
  '🪓': Axe, '🧭': Compass, '🏆': Trophy, '🌍': Globe, '📣': Megaphone, '📋': ClipboardList, '💔': HeartCrack, '⭐': Star, '📉': TrendingDown, '📈': TrendingUp,
  '🔁': Repeat, '⬇': ArrowDown, '⬆': ArrowUp, '🌬': Wind, '💪': BicepsFlexed, '🖊': PenLine, '🚩': Flag, '🍀': Clover, '🎱': Dices, '🥇': Medal,
  '✍': PenLine, '👕': Shirt, '🏁': Flag, '📊': BarChart3, '⚔': Swords, '⚖': Scale,
};

/** An open-source icon for an emoji written in the game data. */
export function GameIcon({ e, className = 'h-5 w-5' }: { e: string; className?: string }) {
  const key = e.replace(/️/g, '');
  const Icon = EMOJI_ICON[key] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
