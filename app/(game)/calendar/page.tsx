import type { Metadata } from 'next';
import { CalendarScreen } from '@/components/screens/CalendarScreen';

export const metadata: Metadata = { title: 'Season' };

export default function CalendarPage() {
  return <CalendarScreen />;
}
