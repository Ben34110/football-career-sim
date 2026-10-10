'use client';

import { Trophy } from 'lucide-react';
import { Chip } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { groupHonours } from '@/lib/engine/honours';
import { useT } from '@/lib/i18n';
import type { SeasonRecord } from '@/lib/types';

/** The cabinet: one chip per title, with the flag of the country it was won in and ×2, ×3 when it was won again. */
export function Honours({ trophies, history, clubId }: { trophies: string[]; history: SeasonRecord[]; clubId: string | null }) {
  const t = useT();
  const groups = groupHonours(trophies, history, clubId);
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => (
        <Chip key={g.key} tone={g.title.startsWith('Golden Star') ? 'good' : 'gold'}>
          <Trophy className="h-3 w-3" />
          <span>{g.count === 1 ? t(g.labels[0]) : t(g.title)}</span>
          {g.flag && <Flag emoji={g.flag} size={11} />}
          {g.count > 1 && <b className="font-num">×{g.count}</b>}
        </Chip>
      ))}
    </div>
  );
}
