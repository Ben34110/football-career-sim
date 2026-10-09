import { GameShell } from '@/components/shell/GameShell';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
