/** Used by Settings → Send feedback (`mailto:`). Replace with your support address before release. */
export const FEEDBACK_MAILTO =
  'mailto:support@subradar.app?subject=SubRadar%20Max%20feedback&body=';

/**
 * When false, StoreKit / Play Billing is not used and everyone gets unlimited renewals + export.
 * Set `EXPO_PUBLIC_IAP_ENABLED=1` (EAS env or `.env`) after ASC/Play subscription products exist, then rebuild.
 */
export const IAP_ENABLED =
  process.env.EXPO_PUBLIC_IAP_ENABLED === '1' ||
  process.env.EXPO_PUBLIC_IAP_ENABLED === 'true';

/**
 * Must match App Store Connect / Play Console product IDs exactly.
 * Current ASC: single auto-renewable product `subradarpro` ($1.99). When you add
 * separate monthly/yearly products, replace these strings and add SKUs to SUBSCRIPTION_SKUS.
 */
export const PRODUCT_IDS = {
  monthly: 'subradarpro',
  yearly: 'subradarpro',
} as const;

/** Unique list for `getSubscriptions` (dedupe when monthly/yearly share one product). */
export const SUBSCRIPTION_SKUS = ['subradarpro'] as const;

export const FREE_LIMIT = 3;

export const STORAGE_KEYS = {
  renewals: '@subradar/renewals_v1',
  devPro: '@subradar/dev_pro',
} as const;
