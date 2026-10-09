'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Repeat, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttributeBars } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Card, Chip, SectionTitle } from '@/components/ui/Card';
import { getClub } from '@/lib/data/clubs';
import { seasonLabel } from '@/lib/engine/player';
import { ordinal, useGameStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function SeasonEnd() {
  const summary = useGameStore((s) => s.lastSummary);
  const player = useGameStore((s) => s.player);
  const pendingMove = useGameStore((s) => s.pendingMove);
  const startNext = useGameStore((s) => s.startNextSeason);
  const router = useRouter();
  if (!summary || !player) return null;
  const { record: r, table } = summary;
  const move = pendingMove ? getClub(pendingMove.clubId) : null;
  const up = summary.ovrAfter - summary.ovrBefore;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
      <Card strong gold className="p-5 text-center">
        <div className="eyebrow text-gold-300">Season review</div>
        <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none">{seasonLabel(r.year)} Complete</h2>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Mini label="League" value={`${r.leaguePos}${ordinal(r.leaguePos)}`} />
          <Mini label="Apps" value={r.apps} />
          <Mini label="G + A" value={`${r.goals}+${r.assists}`} />
          <Mini label="Avg" value={r.avgRating ? r.avgRating.toFixed(1) : '–'} />
        </div>
        {r.trophies.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {r.trophies.map((t) => (
              <Chip key={t} tone="gold">
                <Trophy className="h-3 w-3" /> {t}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      <div>
        <SectionTitle right={<Chip tone={up > 0 ? 'good' : up < 0 ? 'bad' : 'neutral'}>OVR {summary.ovrBefore} → {summary.ovrAfter}</Chip>}>Development · age {player.age}</SectionTitle>
        <Card className="p-4">
          <AttributeBars attrs={player.attrs} deltas={summary.delta} />
        </Card>
      </div>

      <Card className="p-0">
        <div className="eyebrow px-4 pt-3.5">Final table</div>
        <div className="mt-2 divide-y divide-white/[0.05]">
          {table.slice(0, 5).map((t, i) => (
            <div key={t.id} className={cn('flex items-center gap-3 px-4 py-2 text-[13px]', t.isMe && 'bg-neon-400/10 font-bold text-neon-300')}>
              <span className="font-num w-4 text-zinc-500">{i + 1}</span>
              <span className="flex-1 truncate">{t.name}</span>
              <span className="font-num font-bold">{t.pts}</span>
            </div>
          ))}
        </div>
      </Card>

      {summary.contractExpiring && (
        <Card className="border-gold-400/30 p-4 text-sm">
          <b className="text-gold-300">Contract expiring.</b>{' '}
          <span className="text-zinc-400">
            {player.rep.coachTrust >= 35 ? 'Your club will offer an extension if you stay.' : 'Coach Trust is low — you may be released. Check the market.'}
          </span>
        </Card>
      )}
      {move && (
        <Card gold className="flex items-center gap-3 p-4 text-sm">
          <Repeat className="h-4 w-4 text-gold-300" />
          <span>
            {pendingMove?.source === 'renewal' ? 'New deal agreed with' : 'Pre-agreed move to'} <b>{move.name}</b>.
          </span>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" size="lg" onClick={() => router.push('/transfers')}>
          <Repeat className="h-4 w-4" /> Transfers
        </Button>
        <Button
          size="lg"
          variant="gold"
          onClick={() => {
            startNext();
          }}
        >
          {summary.retiring ? 'Retire' : 'Next season'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <Link href="/profile" className="block text-center text-xs font-semibold text-zinc-500">
        View career history
      </Link>
    </motion.div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-black/30 py-2.5">
      <div className="font-num text-xl font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}
