import type { Metadata } from 'next';
import { TransfersScreen } from '@/components/screens/TransfersScreen';

export const metadata: Metadata = { title: 'Transfers' };

export default function TransfersPage() {
  return <TransfersScreen />;
}
