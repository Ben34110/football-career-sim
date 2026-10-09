import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl font-extrabold text-gold-300">404</p>
      <p className="mt-2 text-zinc-400">Offside — that page doesn’t exist.</p>
      <Link href="/" className="mt-6 rounded-2xl bg-neon-400 px-5 py-3 text-sm font-bold text-zinc-950">
        Back to kick-off
      </Link>
    </div>
  );
}
