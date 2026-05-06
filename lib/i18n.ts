import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import type { Locale } from 'expo-localization';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import type { AppLocalePreference } from './localePreference';

export const i18n = new I18n({ en, zh });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = 'en';

export type AppLocale = 'zh' | 'en';

/** Map device locale list to our `zh` | `en` (only Simplified bundle today). */
export function localesToAppLocale(locales: Locale[]): AppLocale {
  const primary = locales[0];
  if (!primary) return 'en';
  const code = (primary.languageCode ?? '').toLowerCase();
  const tag = (primary.languageTag ?? '').toLowerCase();
  if (code === 'zh' || tag.startsWith('zh')) return 'zh';
  return 'en';
}

export function systemLocaleToApp(): AppLocale {
  return localesToAppLocale(Localization.getLocales());
}

export function resolveAppLocale(
  preference: AppLocalePreference,
  /** Pass `useLocales()`-derived value so「跟随系统」updates when OS language changes. */
  systemApp: AppLocale = systemLocaleToApp(),
): AppLocale {
  if (preference === 'zh' || preference === 'en') return preference;
  return systemApp;
}

export function setI18nLocale(locale: AppLocale): void {
  i18n.locale = locale;
}

export function t(scope: string, options?: Record<string, string | number>): string {
  return i18n.t(scope, options);
}
