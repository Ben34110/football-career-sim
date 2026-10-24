/**
 * Real-money purchases (unlimited-lives passes and match-day boosts).
 *
 * The web build has no payment processor, and Apple requires In-App Purchase for digital
 * consumables in an App Store app. So purchases go through a provider that the native shell
 * (e.g. Capacitor + StoreKit / RevenueCat) registers at start-up:
 *
 *   registerPaymentProvider({ name: 'storekit', isReal: true, purchase: async (pack) => {...} });
 *
 * - Development (or NEXT_PUBLIC_IAP_TEST=1): a test provider grants lives instantly, no money moves.
 * - Production web without a native provider: purchases are disabled ("coming to the App Store").
 */
/** What the payment provider is asked to sell: the id is the App Store product id. */
export interface PaymentProduct {
  id: string;
  /** Display price in euros (the App Store tier price is set in App Store Connect) */
  priceEur: number;
}

/** Unlimited lives for a while: no life is spent and none is missed until the time runs out. Stacks if bought again. */
export interface LifePass extends PaymentProduct {
  id: 'unlimited_3h' | 'unlimited_24h';
  hours: number;
}

/** A match-day boost sold for real money (`boost_attack`, `boost_mental`, …). */
export const boostProduct = (b: { id: string; priceEur: number }): PaymentProduct => ({ id: `boost_${b.id}`, priceEur: b.priceEur });

export const LIFE_PASSES: LifePass[] = [
  { id: 'unlimited_3h', hours: 3, priceEur: 3.99 },
  { id: 'unlimited_24h', hours: 24, priceEur: 4.99 },
];

export interface PaymentResult {
  ok: boolean;
  error?: string;
  /** What the store said, to show the player (and the App Review team) why a purchase could not be made */
  detail?: string;
}

export interface PaymentProvider {
  name: string;
  /** false = test mode, nothing is charged */
  isReal: boolean;
  purchase: (product: PaymentProduct) => Promise<PaymentResult>;
  /** The price the store shows for a product (localised, from the App Store tier), when it is known */
  priceOf?: (productId: string) => string | undefined;
}

const testProvider: PaymentProvider = {
  name: 'test',
  isReal: false,
  purchase: async () => ({ ok: true }),
};

const unavailable: PaymentProvider = {
  name: 'unavailable',
  isReal: false,
  purchase: async () => ({ ok: false, error: 'unavailable' }),
};

const testMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_IAP_TEST === '1';

let provider: PaymentProvider = testMode ? testProvider : unavailable;

export const registerPaymentProvider = (p: PaymentProvider) => {
  provider = p;
};

export const getPaymentProvider = () => provider;
export const paymentsAvailable = () => provider.name !== 'unavailable';
export const isTestPayments = () => paymentsAvailable() && !provider.isReal;

export const formatEur = (n: number, lang: 'en' | 'fr') =>
  new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(n);

/** What to show as the price of a product: the store's own price in the app, the euro price written in the game otherwise. */
export const displayPrice = (product: PaymentProduct, lang: 'en' | 'fr') => provider.priceOf?.(product.id) ?? formatEur(product.priceEur, lang);
