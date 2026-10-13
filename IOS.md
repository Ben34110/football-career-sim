# Ultime Player on iPhone (Xcode → TestFlight → App Store)

The iPhone app is the same game, exported as static files and wrapped by [Capacitor](https://capacitorjs.com).
The Vercel web build is unaffected (the export only happens with `BUILD_TARGET=ios`).

## What you need on the Mac
- **Xcode** (from the Mac App Store, then open it once to install the iOS runtime) and an Apple Developer account.
- Node 20+. No CocoaPods: Capacitor 8 uses Swift Package Manager.

## Build and open
```bash
npm install
npm run ios        # exports the game, copies it into ios/, opens Xcode
```
`npm run build:ios` does the export + sync only. Run it again after every change to the game, then press ▶ in Xcode.

## First run in Xcode
1. Select the **App** target → **Signing & Capabilities** → pick your **Team** (automatic signing).
2. If `com.ben34110.pitchlegacy` is taken or you want your own id, change the **Bundle Identifier** — and update
   `appId` in `capacitor.config.json` and `IAP_PREFIX` in `lib/native/ios.ts` to match, plus the `productID`s in
   `ios/App/PitchLegacy.storekit`.
3. Pick a simulator or your iPhone and press **Run**.

## Testing purchases without App Store Connect
The shared scheme already points to `ios/App/PitchLegacy.storekit` (6 consumables: `unlimited_3h`, `unlimited_24h`,
`boost_attack`, `boost_mental`, `boost_defence`, `boost_general`, all behind the bundle prefix). Run from Xcode and the
shop, the boost picker and the unlimited-lives passes go through real StoreKit with fake money. Transactions can be inspected and
refunded in **Debug → StoreKit → Manage Transactions**.
If the scheme's StoreKit file is lost: **Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration**.

## Before submitting
- **App Store Connect**: create the app (same bundle id), then the 6 in-app purchases (type *Consumable*) with the same
  product ids as in `PitchLegacy.storekit`, and a price tier each (the game shows the store's own price).
- **Archive**: set the run destination to *Any iOS Device (arm64)* → **Product → Archive** → **Distribute App** →
  App Store Connect (TestFlight first).
- Needed by review: a **privacy policy URL**, an **age rating** questionnaire, screenshots for 6.7" and 6.5" iPhones,
  and the review notes (no account, no login; all data stays on the device).
- Already handled: app icon (1024, no alpha), dark launch screen, iPhone-only, portrait-only, dark UI, export
  compliance flag (`ITSAppUsesNonExemptEncryption = NO`), Taptic haptics, status bar, store prices.

## Offline, and what runs where
- **In the iPhone app everything is on the phone**: the game, the flags, the fonts, the save. There is no server, no
  account and no network call, so it plays fully offline. Vercel is not used by the app at all.
- **The web version** (Vercel) is a static site: no functions, no image optimisation, nothing billed per request. Its
  files are cached for a year (`next.config.mjs`) and a service worker (`public/sw.js`) keeps the game on the device after
  the first visit, so it also plays offline and a returning visitor costs the host almost nothing. The manifest lets
  people install it to their home screen. Free-plan note: Vercel's Hobby plan is for non-commercial use.

## Rewarded ads (AdMob)
- Out of lives → **Watch an ad · +3 lives** (pre-match screen and shop); in a boost's sheet → **Watch an ad · get it
  free**. Allowance: 5 ads/day for lives, 3/day for boosts (`AD_DAILY_CAP` in `lib/ads.ts`). The reward is only given when
  the ad was watched to the end.
- In a browser during development a 3-second *test ad* stands in; a production web build has no ads.
- The app ships with **Google's test ids** (`lib/native/ads-config.ts` and `GADApplicationIdentifier` in
  `ios/App/App/Info.plist`): they always fill and earn nothing. Create the app in AdMob, then replace both ids and set
  `testing: false` before release. Paste Google's full SKAdNetwork list into `Info.plist` for best fill.
- Consent and tracking: the first tap on "watch an ad" shows the GDPR form (EU) then the App Tracking Transparency
  prompt, in context. In App Store Connect, answer the privacy questions for advertising/tracking, and keep the age
  rating consistent with the ads you allow.

## Known follow-ups
- **Save data** lives in the web view's `localStorage`. iOS can clear it when the device is very short of space; for a
  long career, mirror the save in native storage (`@capacitor/preferences`) before a public release.
- **Sharing** the player card uses the web share sheet (works on iOS 15+); `@capacitor/share` is the native option.

## Game Center (goals leaderboard)

- Swift plugin: `ios/App/App/GameCenterPlugin.swift`, registered by `AppViewController.swift` (set as the storyboard's view controller); the Game Center entitlement is in `ios/App/App/App.entitlements`.
- JS side: `lib/native/gamecenter.ts` (sign-in at start-up, score = goals of every career on the phone, sent a few seconds after each change). The button is in the Profile screen (`components/ui/LeaderboardButton.tsx`).
- App Store Connect → Game Center → Leaderboards: one leaderboard, ID `com.ben34110.pitchlegacy.goals`, Integer, Best Score, High to Low, range 0 – 100000.
