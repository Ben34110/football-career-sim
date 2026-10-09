import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/screens/ProfileScreen';

export const metadata: Metadata = { title: 'Player' };

export default function ProfilePage() {
  return <ProfileScreen />;
}
