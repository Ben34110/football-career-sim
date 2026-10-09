# Pitch Legacy — Football Career Simulation

Mobile-first career sim built with Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, Lucide and Zustand (LocalStorage persistence).

```bash
npm install
npm run dev      # http://localhost:3000  (best viewed at phone width)
npm run build && npm start
```

## Structure
- `app/` — routes: `/` title, `/create` FTUE, `(game)/` home · match · calendar · transfers · profile
- `components/match/` — locker-room talk, live ticker + momentum, clutch sheet, **8-zone `GoalTarget`**, shootout, press zone, summary
- `lib/engine/` — pure, testable logic: `match`, `kick` (keeper dive), `shootout`, `season`, `transfers`, `player`
- `lib/data/` — mock data: clubs, nationalities, speeches, press questions, clutch deck
- `lib/store.ts` — Zustand store persisted to LocalStorage (`fcs-save-v1`)
