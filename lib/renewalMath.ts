import { addMonths, addWeeks, addYears, format, parse, startOfDay } from 'date-fns';
import type { BillingCycle } from './types';

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

/** 9:00 local on calendar day `reminderDays` before charge day (0 = same day). */
export function reminderFireDate(isoChargeDate: string, reminderDays: number): Date | null {
  const chargeDay = startOfDay(parseLocalDate(isoChargeDate));
  const remindDay = new Date(chargeDay);
  remindDay.setDate(remindDay.getDate() - reminderDays);
  remindDay.setHours(9, 0, 0, 0);
  return remindDay;
}
