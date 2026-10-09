'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

type Variant = 'primary' | 'gold' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon border border-neon-300/60 hover:brightness-110',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-500 text-zinc-950 shadow-gold border border-gold-200/60 hover:brightness-110',
  ghost: 'bg-white/[0.06] text-zinc-100 border border-white/10 hover:bg-white/10',
  danger: 'bg-crimson-500/15 text-crimson-400 border border-crimson-500/40 hover:bg-crimson-500/25',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-xl gap-1.5',
  md: 'h-11 px-5 text-sm rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2.5',
};

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children?: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block, className, children, onClick, disabled, ...rest }: Props) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled}
      onClick={(e) => {
        haptic(10);
        onClick?.(e);
      }}
      className={cn(
        'inline-flex select-none items-center justify-center font-bold tracking-tight transition-[filter,background] duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
