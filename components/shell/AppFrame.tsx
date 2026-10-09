'use client';

import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/Toaster';
import { SigningCeremony } from './SigningCeremony';
import { useHydrated } from '@/lib/hooks';

/** Phone-sized column on desktop, full-bleed on mobile. Waits for the save to load. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-zinc-950">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-neon-500/10 blur-[120px]" />
        <div className="absolute -bottom-52 right-0 h-[380px] w-[480px] rounded-full bg-gold-400/[0.07] blur-[120px]" />
      </div>
      <div className="relative z-10 mx-auto min-h-dvh w-full max-w-[430px] sm:border-x sm:border-white/[0.06] sm:bg-zinc-950/60 sm:shadow-[0_0_80px_-20px_rgba(16,224,138,0.15)]">
        {hydrated ? (
          children
        ) : (
          <div className="flex min-h-dvh items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neon-400" />
          </div>
        )}
      </div>
      <SigningCeremony />
      <Toaster />
    </div>
  );
}
