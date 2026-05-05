import { addMonths, addWeeks, addYears, format, parse, startOfDay } from 'date-fns';
import type { BillingCycle, Renewal } from './types';

const DATE_KEY = 'yyyy-MM-dd';

export function parseLocalDate(isoDay: string): Date {
  return parse(isoDay, DATE_KEY, new Date());
}

export function monthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return (amount * 52) / 12;
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

export function advanceNextCharge(isoDate: string, cycle: BillingCycle): string {
  const d = parseLocalDate(isoDate);
  const next =
    cycle === 'weekly'
      ? addWeeks(d, 1)
      : cycle === 'monthly'
        ? addMonths(d, 1)
        : addYears(d, 1);
  return format(startOfDay(next), DATE_KEY);
}

/**
 * When `nextChargeDate` is before today (local calendar), advance by billing cycle until it is
 * today or later, so list UI shows the upcoming charge after past due dates.
 */
export function rollRenewalIfChargeDayPassed(r: Renewal, now: Date = new Date()): Renewal {
  const todayIso = format(startOfDay(now), DATE_KEY);
  if (r.nextChargeDate >= todayIso) return r;
  let next = r.nextChargeDate;
  let guard = 0;
  while (next < todayIso && guard < 240) {
    next = advanceNextCharge(next, r.billingCycle);
    guard += 1;
  }
  return { ...r, nextChargeDate: next };
}

/** True when `isoChargeDate` (yyyy-MM-dd) is today in the device local calendar. */
export function isLocalChargeDayToday(isoChargeDate: string, now: Date = new Date()): boolean {
  return startOfDay(parseLocalDate(isoChargeDate)).getTime() === startOfDay(now).getTime();
}

/** 9:00 local on calendar day `reminderDays` before charge day (0 = same day). */
export function reminderFireDate(isoChargeDate: string, reminderDays: number): Date | null {
  const chargeDay = startOfDay(parseLocalDate(isoChargeDate));
  const remindDay = new Date(chargeDay);
  remindDay.setDate(remindDay.getDate() - reminderDays);
  remindDay.setHours(9, 0, 0, 0);
  return remindDay;
}

/**
 * Actual schedule time for expo-notifications. If the nominal 9:00 bell on the reminder day has
 * already passed (e.g. user chose「当天提醒」and saved after 9:00), still schedule once later the
 * same calendar day instead of dropping the notification entirely.
 */
export function nextSchedulableReminderFire(
  isoChargeDate: string,
  reminderDays: number,
  now: Date = new Date(),
): Date | null {
  const nominal = reminderFireDate(isoChargeDate, reminderDays);
  if (!nominal) return null;

  if (nominal.getTime() > now.getTime()) {
    return nominal;
  }

  const endOfRemindDay = startOfDay(nominal);
  endOfRemindDay.setHours(23, 59, 59, 999);

  if (now.getTime() > endOfRemindDay.getTime()) {
    return null;
  }

  const catchUpDelayMs = 10_000;
  const candidate = new Date(now.getTime() + catchUpDelayMs);
  const cap = new Date(endOfRemindDay.getTime() - 750);
  const target = candidate.getTime() > cap.getTime() ? cap : candidate;
  if (target.getTime() <= now.getTime()) {
    return null;
  }
  return target;
}
