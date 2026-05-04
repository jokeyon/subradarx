/**
 * `Number.prototype.toLocaleString(..., { style: 'currency' })` requires a valid ISO 4217
 * currency for most ICU builds. Hermes may throw RangeError for crypto-style codes (e.g. USDT)
 * or odd locale/currency pairs.
 */

const DECIMAL_LOCALE_FALLBACK = 'en-US';

export function normalizeCurrencyCodeForIntl(code: string | null | undefined): string {
  const raw = String(code ?? 'USD').trim().toUpperCase();
  if (raw.length === 3 && /^[A-Z]{3}$/.test(raw)) return raw;
  return 'USD';
}

function safeLocaleTag(localeTag: string): string {
  return typeof localeTag === 'string' && localeTag.trim().length > 0 ? localeTag : DECIMAL_LOCALE_FALLBACK;
}

function formatDecimalWithCode(amount: number, code: string, locale: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    const s = n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${s} ${code}`;
  } catch {
    return `${n.toFixed(2)} ${code}`;
  }
}

/**
 * Format for display / export. Never throws: falls back to "12.34 CODE" if currency style is unsupported.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string | null | undefined,
  localeTag: string,
): string {
  const cur = normalizeCurrencyCodeForIntl(currencyCode);
  const locale = safeLocaleTag(localeTag);
  const n = Number.isFinite(amount) ? amount : 0;

  const tryCurrency = (code: string): string | null => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(n);
    } catch {
      return null;
    }
  };

  const primary = tryCurrency(cur);
  if (primary != null) return primary;

  const usd = tryCurrency('USD');
  if (usd != null) return usd;

  try {
    return new Intl.NumberFormat(DECIMAL_LOCALE_FALLBACK, { style: 'currency', currency: 'USD' }).format(n);
  } catch {
    return formatDecimalWithCode(n, cur, DECIMAL_LOCALE_FALLBACK);
  }
}
