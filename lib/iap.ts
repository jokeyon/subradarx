import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ProductSubscription,
  type Purchase,
} from 'react-native-iap';
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
    await initConnection();
    return true;
  } catch {
    return false;
  }
}

export async function endIapConnection() {
  if (!iapSupported()) return;
  try {
    await endConnection();
  } catch {
    /* ignore */
  }
}

function subscriptionRow(p: ProductSubscription): SubProduct {
  return {
    productId: p.id,
    title: p.title,
    description: p.description,
    localizedPrice: p.displayPrice,
  };
}

export async function fetchSubscriptionProducts(): Promise<SubProduct[]> {
  if (!iapSupported()) return [];
  try {
    const subs = (await fetchProducts({ skus: SKUS, type: 'subs' })) as ProductSubscription[];
    return sortSubscriptionProducts(subs.map(subscriptionRow));
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
  await requestPurchase({
    type: 'subs',
    request: {
      apple: { sku },
    },
  });
}

function purchaseProductId(p: Purchase): string {
  return 'productId' in p && p.productId ? p.productId : p.id;
}

export async function restorePurchases(): Promise<boolean> {
  if (!iapSupported()) return false;
  try {
    const purchases = await getAvailablePurchases({
      onlyIncludeActiveItemsIOS: true,
    });
    return purchases.some(
      (p) => purchaseProductId(p) === PRODUCT_IDS.monthly || purchaseProductId(p) === PRODUCT_IDS.yearly,
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
  const sub = purchaseUpdatedListener(async (purchase) => {
    const pid = purchaseProductId(purchase);
    if (pid === PRODUCT_IDS.monthly || pid === PRODUCT_IDS.yearly) {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        /* ignore */
      }
      onOwned();
    }
  });
  const err = purchaseErrorListener(() => {
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
