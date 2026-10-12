import Image from 'next/image';
import { cn } from '@/lib/utils';

/** The app's mark: a geometric ball in motion. Transparent, so it sits on any dark surface. */
export function Logo({ size = 96, className, priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return <Image src="/logo.png" alt="" width={size} height={size} priority={priority} unoptimized className={cn('select-none object-contain', className)} draggable={false} />;
}
