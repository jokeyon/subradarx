import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import type { AppLocale } from './i18n';

export function formatMediumDate(d: Date, locale: AppLocale): string {
  if (locale === 'zh') {
    return format(d, 'yyyy年M月d日', { locale: zhCN });
  }
  return format(d, 'MMM d, yyyy', { locale: enUS });
}

export function intlLocaleTag(locale: AppLocale): string {
  return locale === 'zh' ? 'zh-Hans-CN' : 'en-US';
}
