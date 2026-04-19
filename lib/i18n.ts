import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import type { AppLocalePreference } from './localePreference';

export const i18n = new I18n({ en, zh });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = 'en';

export type AppLocale = 'zh' | 'en';

export function systemLocaleToApp(): AppLocale {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  if (code === 'zh') return 'zh';
  return 'en';
}

export function resolveAppLocale(preference: AppLocalePreference): AppLocale {
  if (preference === 'zh' || preference === 'en') return preference;
  return systemLocaleToApp();
}

export function setI18nLocale(locale: AppLocale): void {
  i18n.locale = locale;
}

export function t(scope: string, options?: Record<string, string | number>): string {
  return i18n.t(scope, options);
}
