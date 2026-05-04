import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import { IAP_ENABLED, PRODUCT_IDS, SUBSCRIPTION_SKUS } from './constants';

/** Store subscription product row from react-native-iap (fields vary by platform). */
export type SubProduct = {
  productId: string;
  title?: string;
  description?: string;
  localizedPrice?: string;
};

/** Yearly first (better default for LTV), then monthly. Unknown IDs last. */
function sortSubscriptionProducts(products: SubProduct[]): SubProduct[] {
  const order: string[] = [PRODUCT_IDS.yearly, PRODUCT_IDS.monthly];
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  return [...products].sort((a, b) => rank(a.productId) - rank(b.productId));
}

const SKUS = Platform.select({
  ios: [...SUBSCRIPTION_SKUS],
  android: [],
  default: [],
})!;

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** In-app subscriptions: **iOS (App Store) only** for now. */
export function iapSupported(): boolean {
  if (!IAP_ENABLED) return false;
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') return false;
  if (isExpoGo()) return false;
  return true;
}

export async function initIapConnection(): Promise<boolean> {
  if (!iapSupported()) return false;
  try {
    await RNIap.initConnection();
    if (Platform.OS === 'android') {
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
    }
    return true;
  } catch {
    return false;
  }
}

export async function endIapConnection() {
  if (!iapSupported()) return;
  try {
    await RNIap.endConnection();
  } catch {
    /* ignore */
  }
}

export async function fetchSubscriptionProducts(): Promise<SubProduct[]> {
  if (!iapSupported()) return [];
  try {
    const subs = await RNIap.getSubscriptions({ skus: SKUS });
    return sortSubscriptionProducts(subs as SubProduct[]);
  } catch {
    return [];
  }
}

export async function requestSubscriptionPurchase(sku: string): Promise<void> {
  if (!iapSupported()) {
    throw new Error(
      Platform.OS === 'android'
        ? 'Subscriptions are available on iOS (App Store) only.'
        : 'Purchases require a dev/production build (not Expo Go).',
    );
  }
  await RNIap.requestSubscription({ sku });
}

export async function restorePurchases(): Promise<boolean> {
  if (!iapSupported()) return false;
  try {
    const purchases = await RNIap.getAvailablePurchases();
    return purchases.some(
      (p) => p.productId === PRODUCT_IDS.monthly || p.productId === PRODUCT_IDS.yearly,
    );
  } catch {
    return false;
  }
}

export function listenPurchaseUpdates(
  onOwned: () => void,
): { remove: () => void } {
  if (!iapSupported()) {
    return { remove: () => {} };
  }
  const sub = RNIap.purchaseUpdatedListener(async (purchase) => {
    const pid = purchase.productId;
    if (pid === PRODUCT_IDS.monthly || pid === PRODUCT_IDS.yearly) {
      try {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
      } catch {
        /* ignore */
      }
      onOwned();
    }
  });
  const err = RNIap.purchaseErrorListener(() => {
    /* user cancelled etc. */
  });
  return {
    remove: () => {
      try {
        sub.remove();
        err.remove();
      } catch {
        /* ignore */
      }
    },
  };
}

export async function hasActiveProEntitlement(): Promise<boolean> {
  if (!iapSupported()) return false;
  return restorePurchases();
}
