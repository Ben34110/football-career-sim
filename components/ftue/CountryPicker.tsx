'use client';

import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NATIONALITIES, REGIONS } from '@/lib/data/nationalities';
import { haptic } from '@/lib/haptics';
import { useLang, useT } from '@/lib/i18n';
import type { Nationality } from '@/lib/types';
import { cn } from '@/lib/utils';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Searchable list of every playable country, filtered by continent. */
export function CountryPicker({ value, onPick, label }: { value: string; onPick: (n: Nationality) => void; label?: string }) {
  const t = useT();
  const { lang } = useLang();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Nationality['region'] | 'All'>('All');

  const list = useMemo(() => {
    const q = norm(query.trim());
    return NATIONALITIES.filter((n) => (region === 'All' || n.region === region) && (!q || norm(n.name).includes(q) || norm(t(n.name)).includes(q))).sort((a, b) =>
      t(a.name).localeCompare(t(b.name), lang),
    );
  }, [query, region, t, lang]);

  return (
    <div>
      {label && <span className="eyebrow">{label}</span>}
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search a country…')}
          autoComplete="off"
          className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm font-medium outline-none ring-neon-400/60 placeholder:text-zinc-600 focus:border-neon-400/50 focus:ring-2"
        />
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
        {(['All', ...REGIONS] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            aria-pressed={region === r}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-[12px] font-bold transition-all active:scale-95',
              region === r ? 'border-gold-400/60 bg-gold-400/15 text-gold-300' : 'border-white/10 bg-white/[0.04] text-zinc-400',
            )}
          >
            {t(r)}
          </button>
        ))}
      </div>
      <div className="mt-2 max-h-[300px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5 [scrollbar-width:thin]">
        {list.length === 0 && <p className="p-4 text-center text-sm text-zinc-500">{t('No country found.')}</p>}
        <div className="grid grid-cols-2 gap-1.5">
          {list.map((n) => {
            const active = value === n.code;
            return (
              <button
                key={n.code}
                onClick={() => {
                  onPick(n);
                  haptic(8);
                }}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] font-semibold transition-all active:scale-95',
                  active ? 'border-neon-400/60 bg-neon-400/10 text-neon-300' : 'border-transparent bg-white/[0.03] text-zinc-300',
                )}
              >
                <span className="text-lg leading-none">{n.flag}</span>
                <span className="min-w-0 flex-1 truncate">{t(n.name)}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
