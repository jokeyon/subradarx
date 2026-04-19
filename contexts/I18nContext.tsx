import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  i18n,
  resolveAppLocale,
  setI18nLocale,
  systemLocaleToApp,
  type AppLocale,
} from '../lib/i18n';
import {
  getLocalePreference,
  setLocalePreference,
  type AppLocalePreference,
} from '../lib/localePreference';
import { rescheduleRenewalNotifications } from '../lib/notifications';
import { loadRenewals } from '../lib/storage';

type I18nContextValue = {
  t: (key: string, options?: Record<string, string | number>) => string;
  locale: AppLocale;
  languagePreference: AppLocalePreference;
  setLanguagePreference: (p: AppLocalePreference) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

async function resyncNotificationsForLanguage() {
  try {
    const items = await loadRenewals();
    await rescheduleRenewalNotifications(items);
  } catch (e) {
    console.warn('SubRadar: resyncNotificationsForLanguage failed', e);
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languagePreference, setLanguagePreferenceState] = useState<AppLocalePreference>('system');
  const [locale, setLocale] = useState<AppLocale>(() => {
    const L = systemLocaleToApp();
    setI18nLocale(L);
    return L;
  });

  useEffect(() => {
    void getLocalePreference().then(async (p) => {
      setLanguagePreferenceState(p);
      const L = resolveAppLocale(p);
      setLocale(L);
      setI18nLocale(L);
      await resyncNotificationsForLanguage();
    });
  }, []);

  const setLanguagePreference = useCallback(async (p: AppLocalePreference) => {
    setLanguagePreferenceState(p);
    await setLocalePreference(p);
    const L = resolveAppLocale(p);
    setLocale(L);
    setI18nLocale(L);
    await resyncNotificationsForLanguage();
  }, []);

  const t = useCallback(
    (key: string, options?: Record<string, string | number>) => i18n.t(key, options),
    [locale],
  );

  const value = useMemo(
    () => ({ t, locale, languagePreference, setLanguagePreference }),
    [t, locale, languagePreference, setLanguagePreference],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
