'use client';

import { Loader2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { sharePlayerCard } from '@/lib/shareCard';
import { toast } from '@/lib/toast';
import type { Player } from '@/lib/types';
import { Button } from './Button';

/** Shares the player card as an image (native share sheet on phones, download elsewhere). */
export function ShareCardButton({ player, className }: { player: Player; className?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      block
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await sharePlayerCard(player, t);
        setBusy(false);
        if (r === 'downloaded') toast(t('Card saved as an image.'), 'good');
        else if (r === 'failed') toast(t('Could not create the card.'), 'bad');
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} {t('Share my player card')}
    </Button>
  );
}
