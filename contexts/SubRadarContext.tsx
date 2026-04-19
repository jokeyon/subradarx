import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PermissionStatus } from 'expo-modules-core';
import { Alert, Platform } from 'react-native';
import { FREE_LIMIT, IAP_ENABLED } from '../lib/constants';
import { t } from '../lib/i18n';
import {
  endIapConnection,
  fetchSubscriptionProducts,
  hasActiveProEntitlement,
  initIapConnection,
  iapSupported,
  isExpoGo,
  listenPurchaseUpdates,
  requestSubscriptionPurchase,
  restorePurchases,
  type SubProduct,
} from '../lib/iap';
import {
  getNotificationPermissionStatus,
  rescheduleRenewalNotifications,
  requestNotificationPermission,
} from '../lib/notifications';
import { loadDevProFlag, loadRenewals, saveRenewals, setDevProFlag } from '../lib/storage';
import type { Renewal } from '../lib/types';

type SubRadarContextValue = {
  renewals: Renewal[];
  loading: boolean;
  isPro: boolean;
  devProEnabled: boolean;
  products: SubProduct[];
  canAddMore: boolean;
  refresh: () => Promise<void>;
  setDevPro: (on: boolean) => Promise<void>;
  addRenewal: (r: Omit<Renewal, 'id'>) => Promise<void>;
  updateRenewal: (r: Renewal) => Promise<void>;
  deleteRenewal: (id: string) => Promise<void>;
  purchaseSku: (sku: string) => Promise<void>;
  restore: () => Promise<void>;
  reloadProducts: () => Promise<void>;
  notificationScheduleFailed: boolean;
  retryNotificationSchedule: () => Promise<void>;
};

const SubRadarContext = createContext<SubRadarContextValue | null>(null);

function sortRenewals(list: Renewal[]): Renewal[] {
  return [...list].sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate));
}

function runFirstSaveNotificationPrompt(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return getNotificationPermissionStatus().then((status) => {
    if (status === PermissionStatus.GRANTED) return Promise.resolve();
    return new Promise<void>((resolve) => {
      Alert.alert(
        t('notifications.firstSaveTitle'),
        t('notifications.firstSaveMessage'),
        [
          { text: t('notifications.firstSaveLater'), style: 'cancel', onPress: () => resolve() },
          {
            text: t('notifications.firstSaveContinue'),
            onPress: () => {
              void requestNotificationPermission().finally(() => resolve());
            },
          },
        ],
      );
    });
  });
}

export function SubRadarProvider({ children }: { children: React.ReactNode }) {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [storePro, setStorePro] = useState(false);
  const [devProEnabled, setDevProEnabledState] = useState(false);
  const [products, setProducts] = useState<SubProduct[]>([]);
  const [notificationScheduleFailed, setNotificationScheduleFailed] = useState(false);

  /** When IAP is off, treat everyone as Pro (no paywall) until subscriptions ship. */
  const isPro = !IAP_ENABLED || storePro || devProEnabled;
  const canAddMore = renewals.length < FREE_LIMIT || isPro;

  const persist = useCallback(async (next: Renewal[]) => {
    setRenewals(next);
    await saveRenewals(next);
    try {
      await rescheduleRenewalNotifications(next);
      setNotificationScheduleFailed(false);
    } catch (e) {
      console.warn('SubRadar: rescheduleRenewalNotifications failed', e);
      setNotificationScheduleFailed(true);
    }
  }, []);

  const retryNotificationSchedule = useCallback(async () => {
    try {
      await rescheduleRenewalNotifications(renewals);
      setNotificationScheduleFailed(false);
    } catch (e) {
      console.warn('SubRadar: rescheduleRenewalNotifications retry failed', e);
      setNotificationScheduleFailed(true);
    }
  }, [renewals]);

  const refresh = useCallback(async () => {
    const [list, devFlag] = await Promise.all([loadRenewals(), loadDevProFlag()]);
    setRenewals(sortRenewals(list));
    setDevProEnabledState(devFlag);
    if (iapSupported()) {
      const ok = await initIapConnection();
      if (ok) {
        const owned = await hasActiveProEntitlement();
        setStorePro(owned);
        const subs = await fetchSubscriptionProducts();
        setProducts(subs);
      }
    } else {
      setStorePro(false);
    }
  }, []);

  useEffect(() => {
    let removed: (() => void) | undefined;
    (async () => {
      setLoading(true);
      await refresh();
      if (iapSupported()) {
        const { remove } = listenPurchaseUpdates(() => {
          setStorePro(true);
          void refresh();
        });
        removed = remove;
      }
      setLoading(false);
    })();
    return () => {
      removed?.();
      void endIapConnection();
    };
  }, [refresh]);

  const setDevPro = useCallback(async (on: boolean) => {
    await setDevProFlag(on);
    setDevProEnabledState(on);
  }, []);

  const addRenewal = useCallback(
    async (r: Omit<Renewal, 'id'>) => {
      const prev = await loadRenewals();
      const isFirstSubscription = prev.length === 0;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const next = sortRenewals([...prev, { ...r, id }]);
      await persist(next);
      if (isFirstSubscription) {
        await runFirstSaveNotificationPrompt();
      }
    },
    [persist],
  );

  const updateRenewal = useCallback(
    async (r: Renewal) => {
      const prev = await loadRenewals();
      const next = sortRenewals(prev.map((x) => (x.id === r.id ? r : x)));
      await persist(next);
    },
    [persist],
  );

  const deleteRenewal = useCallback(
    async (id: string) => {
      const prev = await loadRenewals();
      const next = prev.filter((x) => x.id !== id);
      await persist(next);
    },
    [persist],
  );

  const purchaseSku = useCallback(async (sku: string) => {
    await requestSubscriptionPurchase(sku);
  }, []);

  const restore = useCallback(async () => {
    const ok = await restorePurchases();
    setStorePro(ok);
    await refresh();
  }, [refresh]);

  const reloadProducts = useCallback(async () => {
    const subs = await fetchSubscriptionProducts();
    setProducts(subs);
  }, []);

  const value = useMemo(
    () => ({
      renewals,
      loading,
      isPro,
      devProEnabled,
      products,
      canAddMore,
      refresh,
      setDevPro,
      addRenewal,
      updateRenewal,
      deleteRenewal,
      purchaseSku,
      restore,
      reloadProducts,
      notificationScheduleFailed,
      retryNotificationSchedule,
    }),
    [
      renewals,
      loading,
      isPro,
      devProEnabled,
      products,
      canAddMore,
      refresh,
      setDevPro,
      addRenewal,
      updateRenewal,
      deleteRenewal,
      purchaseSku,
      restore,
      reloadProducts,
      notificationScheduleFailed,
      retryNotificationSchedule,
    ],
  );

  return <SubRadarContext.Provider value={value}>{children}</SubRadarContext.Provider>;
}

export function useSubRadar() {
  const ctx = useContext(SubRadarContext);
  if (!ctx) throw new Error('useSubRadar must be used within SubRadarProvider');
  return ctx;
}

export { isExpoGo, requestNotificationPermission };
