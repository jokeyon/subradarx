import { parse } from 'date-fns';
import { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatMediumDate } from './formatDates';
import type { AppLocale } from './i18n';
import { i18n, t } from './i18n';
import type { Renewal } from './types';
import { reminderFireDate } from './renewalMath';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PREFIX = 'renewal:';

export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('subradar-renewals', {
      name: 'Renewal reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export type NotificationPermissionStatus = PermissionStatus;

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return PermissionStatus.GRANTED;
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === PermissionStatus.GRANTED) return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === PermissionStatus.GRANTED;
}

export async function rescheduleRenewalNotifications(items: Renewal[]) {
  if (Platform.OS === 'web') {
    return;
  }

  await ensureAndroidChannel();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== PermissionStatus.GRANTED) {
    return;
  }
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((p) => p.identifier.startsWith(PREFIX))
      .map((p) => Notifications.cancelScheduledNotificationAsync(p.identifier)),
  );

  const lang = (i18n.locale === 'zh' ? 'zh' : 'en') as AppLocale;
  const now = Date.now();
  for (const item of items) {
    const fire = reminderFireDate(item.nextChargeDate, item.reminderDays);
    if (!fire || fire.getTime() <= now) continue;

    const d = parse(item.nextChargeDate, 'yyyy-MM-dd', new Date());
    const dateStr = formatMediumDate(d, lang);
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${item.id}`,
      content: {
        title: t('notification.title'),
        body: t('notification.body', { name: item.name, date: dateStr }),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fire,
      },
    });
  }
}
