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

## Lives, shop and the App Store

- **Lives** regenerate one every 2 minutes (up to 5). A match costs one life.
- **Money** (earned every match) buys lasting upgrades in `/shop`: personal coach (more performance XP),
  nutritionist (less fatigue), media advisor (fewer scandals), agent (better contracts) and a yearly charity gala.
  Attributes themselves only grow through performance on the pitch — never through purchases.
- **Paid life packs** (€1.49 for 5, €3.99 for 15) go through `lib/payments.ts`.
  - In development (or with `NEXT_PUBLIC_IAP_TEST=1`) a test provider grants lives instantly, without any payment.
  - In production on the web the packs are disabled. The native iOS shell (e.g. Capacitor + RevenueCat/StoreKit)
    must call `registerPaymentProvider({ name: 'storekit', isReal: true, purchase })` at start-up.
  - Apple requires In-App Purchase for digital consumables like these, takes a commission (15–30 %),
    and needs a privacy policy URL, an age rating and the price tiers configured in App Store Connect.
- Everything runs in the browser (static pages + `localStorage`), so hosting costs no server CPU.
