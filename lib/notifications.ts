import { parse } from 'date-fns';
import { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatMediumDate } from './formatDates';
import type { AppLocale } from './i18n';
import { i18n, t } from './i18n';
import {
  loadSameDayAnchors,
  pruneSameDayAnchors,
  saveSameDayAnchors,
  type SameDayNotifAnchor,
} from './notificationSameDayAnchor';
import type { Renewal } from './types';
import { isLocalChargeDayToday, nextSchedulableReminderFire } from './renewalMath';

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

/** After save, same-day / same-day reminder fires once ~1h later (not at 9:00). Anchored so reopening the app does not keep pushing it. */
const SAME_DAY_SAVE_DELAY_MS = 60 * 60 * 1000;

export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('subradax-renewals', {
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

function resolveFireDate(
  item: Renewal,
  now: Date,
  anchors: Record<string, SameDayNotifAnchor>,
): { fire: Date | null; anchors: Record<string, SameDayNotifAnchor> } {
  const nextAnchors = { ...anchors };
  const sameDayQuick =
    item.reminderDays === 0 && isLocalChargeDayToday(item.nextChargeDate, now);

  if (sameDayQuick) {
    let a: SameDayNotifAnchor | undefined = nextAnchors[item.id];
    if (a && (a.nextChargeDate !== item.nextChargeDate || a.reminderDays !== item.reminderDays)) {
      delete nextAnchors[item.id];
      a = undefined;
    }
    if (a) {
      const t = new Date(a.fireAtISO);
      if (t.getTime() > now.getTime()) {
        return { fire: t, anchors: nextAnchors };
      }
      delete nextAnchors[item.id];
      const fallback = nextSchedulableReminderFire(item.nextChargeDate, item.reminderDays, now);
      return { fire: fallback, anchors: nextAnchors };
    }
    const fire = new Date(now.getTime() + SAME_DAY_SAVE_DELAY_MS);
    nextAnchors[item.id] = {
      nextChargeDate: item.nextChargeDate,
      reminderDays: item.reminderDays,
      fireAtISO: fire.toISOString(),
    };
    return { fire, anchors: nextAnchors };
  }

  if (nextAnchors[item.id]) delete nextAnchors[item.id];
  const fire = nextSchedulableReminderFire(item.nextChargeDate, item.reminderDays, now);
  return { fire, anchors: nextAnchors };
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
  const now = new Date();
  const validIds = new Set(items.map((i) => i.id));
  let anchors = pruneSameDayAnchors(await loadSameDayAnchors(), validIds);

  if (__DEV__) {
    console.log(`[subradax] rescheduleRenewalNotifications: ${items.length} items at ${now.toISOString()}`);
  }

  for (const item of items) {
    const { fire, anchors: next } = resolveFireDate(item, now, anchors);
    anchors = next;

    if (!fire || fire.getTime() <= now.getTime()) {
      if (__DEV__) {
        const reason = !fire
          ? 'no schedulable time (e.g. reminder day already ended — check 提前提醒 vs 下次扣款日)'
          : `fire ${fire.toISOString()} not after now ${now.toISOString()}`;
        console.warn(
          `[subradax] skip notification id=${item.id} name="${item.name}" next=${item.nextChargeDate} reminderDays=${item.reminderDays} — ${reason}`,
        );
      }
      continue;
    }

    if (__DEV__) {
      console.log(
        `[subradax] scheduled id=${item.id} name="${item.name}" fire=${fire.toISOString()} nextCharge=${item.nextChargeDate} reminderDays=${item.reminderDays}`,
      );
    }

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

  await saveSameDayAnchors(anchors);
}
