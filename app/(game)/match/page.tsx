import type { Metadata } from 'next';
import { MatchScreen } from '@/components/match/MatchScreen';

export const metadata: Metadata = { title: 'Match Day' };

export default function MatchPage() {
  return <MatchScreen />;
}
