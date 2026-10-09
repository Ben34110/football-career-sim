'use client';

import { useLang } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n/lang';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const OPTIONS: { id: Lang; label: string; flag: string }[] = [
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
  { id: 'en', label: 'EN', flag: '🇬🇧' },
];

/** Compact FR / EN switch. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language / Langue" className={cn('inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.05] p-0.5', className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => {
            setLang(o.id);
            haptic(8);
          }}
          aria-pressed={lang === o.id}
          className={cn(
            'flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-all active:scale-95',
            lang === o.id ? 'bg-gradient-to-b from-neon-400 to-neon-600 text-zinc-950 shadow-neon' : 'text-zinc-400',
          )}
        >
          <span aria-hidden>{o.flag}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
