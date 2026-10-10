import {
  ArrowDown, ArrowUp, Axe, BarChart3, Baby, BicepsFlexed, BrickWall, CheckCircle2, CircleDot, CircleHelp, ClipboardList, Clover, Compass, DoorOpen, Dices, Drum, Eye, Flag, Flame, Footprints, Glasses, Globe, Hand, Handshake, Headphones, Heart, HeartCrack, Medal, Megaphone, Music, PenLine, Repeat, Scale, Shield, Shirt, Snowflake, Sparkles, Star, Swords, Target, TrendingDown, TrendingUp, Trophy, Utensils, Volume2, VolumeX, Vote, Wind, Zap, Brain,
  type LucideIcon,
} from 'lucide-react';

/** Every symbol the game data used to write as an emoji, and the open-source icon that replaces it. */
export const EMOJI_ICON: Record<string, LucideIcon> = {
  '⚡': Zap, '⚽': CircleDot, '✅': CheckCircle2, '❤': Heart, '🎖': Medal, '🎧': Headphones, '🎯': Target, '🎷': Music, '👀': Eye, '👶': Baby,
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
