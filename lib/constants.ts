/** Used by Settings → Send feedback (`mailto:`). Replace with your support address before release. */
export const FEEDBACK_MAILTO =
  'mailto:support@subradax.app?subject=subradax%20feedback&body=';

/**
 * When false, StoreKit is not used and everyone gets unlimited renewals + export.
 * Set `EXPO_PUBLIC_IAP_ENABLED=1` (EAS env or `.env`) after App Store Connect
 * subscription products exist, then rebuild. **Subscriptions are iOS-only** (see `iap.ts`).
 */
export const IAP_ENABLED =
  process.env.EXPO_PUBLIC_IAP_ENABLED === '1' ||
  process.env.EXPO_PUBLIC_IAP_ENABLED === 'true';

/**
 * Must match **App Store Connect** auto-renewable subscription product IDs exactly.
 * Put both in the **same subscription group**. Base (USA) pricing in ASC:
 * **$3.99 / month**, **$39.99 / year**. Introductory / promotional offers are configured in ASC.
 */
export const PRODUCT_IDS = {
  monthly: 'subradarpro_monthly',
  yearly: 'subradarpro_yearly',
} as const;

/** All subscription SKUs passed to `getSubscriptions`. */
export const SUBSCRIPTION_SKUS = [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly] as const;

/**
 * Gmail OAuth + scan (optional). Off by default for store until configured & tested.
 * Set `EXPO_PUBLIC_GMAIL_IMPORT_ENABLED=1` (EAS env or `.env`) and rebuild.
 */
export const GMAIL_IMPORT_ENABLED =
  process.env.EXPO_PUBLIC_GMAIL_IMPORT_ENABLED === '1' ||
  process.env.EXPO_PUBLIC_GMAIL_IMPORT_ENABLED === 'true';

export const FREE_LIMIT = 3;

export const STORAGE_KEYS = {
  renewals: '@subradar/renewals_v1',
  devPro: '@subradar/dev_pro',
} as const;
