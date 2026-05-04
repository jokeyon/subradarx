/** Common ISO 4217 codes for picker; pinned first for CJK / global subscriptions. */
const PINNED_ORDER = [
  'CNY',
  'USD',
  'EUR',
  'HKD',
  'TWD',
  'JPY',
  'GBP',
  'KRW',
  'SGD',
  'AUD',
  'CAD',
] as const;

const MORE = [
  'CHF',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'MOP',
  'RUB',
  'INR',
  'THB',
  'MYR',
  'IDR',
  'PHP',
  'VND',
  'AED',
  'SAR',
  'ARS',
  'BRL',
  'MXN',
  'PLN',
  'TRY',
  'ZAR',
  'ILS',
  'CZK',
  'HUF',
  'CLP',
  'COP',
  'PEN',
  'EGP',
  'NGN',
  'PKR',
  'BDT',
  'QAR',
  'KWD',
  'BHD',
  'RON',
  'UAH',
] as const;

export function getCurrencyPickerCodes(currentValue: string): string[] {
  const pinnedSet = new Set<string>(PINNED_ORDER);
  const extra = MORE.filter((c) => !pinnedSet.has(c)).sort((a, b) => a.localeCompare(b));
  const list: string[] = [...PINNED_ORDER, ...extra];
  const raw = currentValue.trim().toUpperCase();
  if (raw.length === 3 && /^[A-Z]{3}$/.test(raw) && !list.includes(raw)) {
    return [raw, ...list];
  }
  return list;
}
