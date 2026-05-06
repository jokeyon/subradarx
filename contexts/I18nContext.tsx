import { useLocales } from 'expo-localization';
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
  localesToAppLocale,
  resolveAppLocale,
  setI18nLocale,
  type AppLocale,
} from '@/lib/i18n';
import {
  getLocalePreference,
  setLocalePreference,
  type AppLocalePreference,
} from '@/lib/localePreference';
import { rescheduleRenewalNotifications } from '@/lib/notifications';
import { loadRenewals } from '@/lib/storage';

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
  const osLocales = useLocales();
  const systemAppLocale = useMemo(() => localesToAppLocale(osLocales), [osLocales]);

  const [languagePreference, setLanguagePreferenceState] = useState<AppLocalePreference>('system');
  const [preferenceHydrated, setPreferenceHydrated] = useState(false);

  useEffect(() => {
    void getLocalePreference().then((p) => {
      setLanguagePreferenceState(p);
      setPreferenceHydrated(true);
    });
  }, []);

  const locale = useMemo(
    () => resolveAppLocale(languagePreference, systemAppLocale),
    [languagePreference, systemAppLocale],
  );

  // `i18n-js` reads `i18n.locale` at translate time. Updating only in `useEffect` runs *after*
  // children render, so React Navigation tab/header options computed on that frame still see the
  // previous locale — and nothing re-renders the tab shell afterward → mixed EN/ZH like the user saw.
  setI18nLocale(locale);

  useEffect(() => {
    if (!preferenceHydrated) return;
    void resyncNotificationsForLanguage();
  }, [locale, preferenceHydrated]);

  const setLanguagePreference = useCallback(async (p: AppLocalePreference) => {
    setLanguagePreferenceState(p);
    await setLocalePreference(p);
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
