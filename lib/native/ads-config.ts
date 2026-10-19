/**
 * AdMob ids for the iPhone app.
 *
 * - `appId` (ca-app-pub-XXXX~YYYY, with a "~"): the app. It must also be in ios/App/App/Info.plist (GADApplicationIdentifier).
 * - `rewardedUnitId` (ca-app-pub-XXXX/ZZZZ, with a "/"): the REWARDED ad unit, created in AdMob under the app
 *   (Ad units → Add ad unit → Rewarded). It is not the same id as the app id.
 * - `testing`: true shows Google's test ads everywhere (they always fill and earn nothing). With false, the App Store release
 *   shows real ads, while TestFlight builds still get test ads (see env.ts): you never see, or click, your own real ads.
 */
export const ADMOB = {
  appId: 'ca-app-pub-2564539089720466~2423151141',
  rewardedUnitId: 'ca-app-pub-2564539089720466/6078580265',
  testing: false,
};
