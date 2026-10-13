import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { registerAdProvider } from '../ads';
import { BOOSTS } from '../data/boosts';
import { ADMOB } from './ads-config';
import { boostProduct, LIFE_PASSES, registerPaymentProvider, type PaymentProduct } from '../payments';

/**
 * Everything that only exists inside the iPhone app. Loaded on demand (never in the browser), once, at start-up.
 *
 * Product ids in App Store Connect (and in `ios/App/PitchLegacy.storekit` for local testing) are the game's own ids behind
 * this prefix: com.ben34110.pitchlegacy.unlimited_3h, …unlimited_24h, …boost_attack, and so on. Keep it in step with the bundle id.
 */
export const IAP_PREFIX = 'com.ben34110.pitchlegacy.';

export async function initNative() {
  // light status bar text on the dark game
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* not available */
  }

  const ids = [...LIFE_PASSES.map((p) => p.id), ...BOOSTS.map((b) => boostProduct(b).id)];
  // the price tier set in App Store Connect is the one to show (it can differ from the euro price written in the game)
  const prices: Record<string, string> = {};
  let supported = false;
  try {
    supported = (await NativePurchases.isBillingSupported()).isBillingSupported;
    if (supported) {
      const { products } = await NativePurchases.getProducts({ productIdentifiers: ids.map((id) => IAP_PREFIX + id), productType: PURCHASE_TYPE.INAPP });
      for (const p of products) prices[p.identifier.replace(IAP_PREFIX, '')] = p.priceString;
    }
  } catch {
    /* products not set up yet: purchases will report as unavailable */
  }

  registerPaymentProvider({
    name: 'storekit',
    isReal: true,
    priceOf: (id) => prices[id],
    purchase: async (product: PaymentProduct) => {
      if (!supported) return { ok: false, error: 'unavailable' };
      try {
        await NativePurchases.purchaseProduct({ productIdentifier: IAP_PREFIX + product.id, productType: PURCHASE_TYPE.INAPP, quantity: 1 });
        return { ok: true };
      } catch (e) {
        const text = e instanceof Error ? e.message : String(e);
        return { ok: false, error: /cancel/i.test(text) ? 'cancelled' : 'failed' };
      }
    },
  });
}

/**
 * Rewarded video. Nothing is asked or loaded at start-up: the first time the player taps "watch an ad" the consent form
 * (GDPR) and the tracking prompt come up in context, then the ad loads and plays.
 */
export function initAds() {
  let setup: Promise<boolean> | null = null;
  let loaded = false;

  // an ad unit id has a "/" (the app id, with a "~", is not one): a wrong id must not ship as broken ads
  const unitOk = /^ca-app-pub-\d+\/\d+$/.test(ADMOB.rewardedUnitId);
  if (!unitOk && !ADMOB.testing) return;
  const unitId = unitOk ? ADMOB.rewardedUnitId : 'ca-app-pub-3940256099942544/1712485313';

  const load = async () => {
    try {
      await AdMob.prepareRewardVideoAd({ adId: unitId, isTesting: ADMOB.testing });
      loaded = true;
    } catch {
      loaded = false;
    }
  };

  const prepare = () =>
    (setup ??= (async () => {
      try {
        await AdMob.initialize({ initializeForTesting: ADMOB.testing });
        try {
          const info = await AdMob.requestConsentInfo();
          if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
        } catch {
          /* no consent form to show */
        }
        try {
          if ((await AdMob.trackingAuthorizationStatus()).status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch {
          /* not asked */
        }
        return true;
      } catch {
        setup = null;
        return false;
      }
    })());

  registerAdProvider({
    name: 'admob',
    isReal: true,
    show: async () => {
      if (!(await prepare())) return { ok: false, error: 'unavailable' };
      if (!loaded) await load();
      if (!loaded) return { ok: false, error: 'unavailable' };
      try {
        // resolves only when the reward is earned; closing the ad early rejects
        await AdMob.showRewardVideoAd();
        loaded = false;
        void load();
        return { ok: true };
      } catch {
        loaded = false;
        void load();
        return { ok: false, error: 'cancelled' };
      }
    },
  });
}

/**
 * The "ad privacy options" entry point (GDPR): shows Google's consent form again so the player can change the choice.
 * Resolves false when no such form applies in the player's region.
 */
export async function openAdPrivacyOptions(): Promise<boolean> {
  try {
    await AdMob.initialize({ initializeForTesting: ADMOB.testing });
    const info = await AdMob.requestConsentInfo();
    if (info.privacyOptionsRequirementStatus !== 'REQUIRED') return false;
    await AdMob.showPrivacyOptionsForm();
    return true;
  } catch {
    return false;
  }
}
