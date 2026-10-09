import type { Metadata } from 'next';
import { CreateWizard } from '@/components/ftue/CreateWizard';

export const metadata: Metadata = { title: 'New Career' };

export default function CreatePage() {
  return <CreateWizard />;
}
