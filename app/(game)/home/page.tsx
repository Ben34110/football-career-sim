import type { Metadata } from 'next';
import { HomeScreen } from '@/components/screens/HomeScreen';

export const metadata: Metadata = { title: 'Hub' };

export default function HomePage() {
  return <HomeScreen />;
}
