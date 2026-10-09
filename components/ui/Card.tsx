import { cn } from '@/lib/utils';

export function Card({
  className,
  gold,
  strong,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { gold?: boolean; strong?: boolean }) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', 'gloss-edge', gold && 'gold-edge', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-0.5">
      <h2 className="eyebrow">{children}</h2>
      {right}
    </div>
  );
}

export function Chip({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'good' | 'bad' | 'gold' | 'info';
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-white/[0.06] text-zinc-300 border-white/10',
    good: 'bg-neon-400/10 text-neon-300 border-neon-400/30',
    bad: 'bg-crimson-500/10 text-crimson-400 border-crimson-500/30',
    gold: 'bg-gold-400/10 text-gold-300 border-gold-400/30',
    info: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
