import { addDays, format, parse, isValid } from 'date-fns';
import type { BillingCycle } from '@/lib/types';
import { extractFirstHttpUrl } from '@/lib/urlUtils';

/** Default English + Chinese keywords for subscription-like mail. */
export const DEFAULT_SUBSCRIPTION_KEYWORDS = [
  'subscription',
  'renew',
  'renewal',
  'renewing',
  'billing',
  'invoice',
  'charged',
  'payment',
  'trial',
  'membership',
  'recurring',
  'auto-pay',
  'autopay',
  '续费',
  '订阅',
  '扣款',
  '账单',
  '试用期',
  '会员',
  '自动续费',
  '付款',
  /** Bank / carrier SMS & CN billing copy */
  '代扣',
  '自动扣款',
  '包月',
  '月费',
  '续期',
  '续订',
  '免密支付',
  '签约',
  '代收费',
  '扣费',
  '扣取',
  '成功扣款',
  '阿里云',
  '百炼',
];

export type EmailRenewalHint = {
  messageId: string;
  name: string;
  amount: number;
  currencyCode: string;
  billingCycle: BillingCycle;
  nextChargeDate: string;
  notes: string;
  matchedKeyword: string;
  /** First http(s) URL in source text (SMS body often puts the link outside the “name” line). */
  cancelUrl?: string;
};

/** Stable JSON shape for Smart Import / Share Extension handoff (v1). All parsing stays on-device. */
export type SubscriptionStructuredJsonV1 = {
  v: 1;
  name: string;
  amount: number | null;
  currencyCode: string | null;
  billingCycle: BillingCycle;
  nextChargeDate: string | null;
  matchedKeyword: string | null;
  confidence: 'high' | 'medium' | 'low';
  sourceExcerpt: string;
  cancelUrl: string | null;
};

export function textMatchesSubscriptionKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const k of keywords) {
    const kk = k.trim();
    if (!kk) continue;
    if (lower.includes(kk.toLowerCase())) return kk;
  }
  return null;
}

/** Best-effort amount + ISO 4217-ish currency from mixed mail text. */
export function extractAmountAndCurrency(text: string): { amount: number; currencyCode: string } | null {
  const t = text.replace(/\u00a0/g, ' ');

  const currencyFirst = /\b(USD|EUR|GBP|CNY|JPY|HKD|TWD|AUD|CAD)\s*[$:]?\s*([\d.,]+)\b/i.exec(t);
  if (currencyFirst) {
    const n = Number.parseFloat(currencyFirst[2]!.replace(/,/g, ''));
    if (Number.isFinite(n)) return { amount: n, currencyCode: currencyFirst[1]!.toUpperCase() };
  }

  const dollar = /\$\s*([\d.,]+)\b/.exec(t);
  if (dollar) {
    const n = Number.parseFloat(dollar[1]!.replace(/,/g, ''));
    if (Number.isFinite(n)) return { amount: n, currencyCode: 'USD' };
  }

  const cny = /(?:¥|￥|RMB)\s*([\d.,]+)/.exec(t);
  if (cny) {
    const n = Number.parseFloat(cny[1]!.replace(/,/g, ''));
    if (Number.isFinite(n)) return { amount: n, currencyCode: 'CNY' };
  }

  const bare = /\b([\d]+[.,]\d{2})\s*(USD|EUR|GBP|CNY)\b/i.exec(t);
  if (bare) {
    const n = Number.parseFloat(bare[1]!.replace(/,/g, ''));
    if (Number.isFinite(n)) return { amount: n, currencyCode: bare[2]!.toUpperCase() };
  }

  const rmbCn = /(?:人民币|RMB)\s*([\d,]+(?:\.\d{1,2})?)(?=\s*元|[，,。\s]|$)/i.exec(t);
  if (rmbCn) {
    const n = Number.parseFloat(rmbCn[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return { amount: n, currencyCode: 'CNY' };
  }

  const labeledCn =
    /(?:金额|扣款(?:金额)?|实付|交易金额|支付金额|价款|消费)[：:\s]*(?:￥|¥|人民币)?\s*([\d,]+(?:\.\d{1,2})?)\s*元?/i.exec(t);
  if (labeledCn) {
    const n = Number.parseFloat(labeledCn[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return { amount: n, currencyCode: 'CNY' };
  }

  const cnyTwoDec = /([\d,]+\.\d{2})\s*元/.exec(t);
  if (cnyTwoDec) {
    const n = Number.parseFloat(cnyTwoDec[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return { amount: n, currencyCode: 'CNY' };
  }

  const cnyYuanInt = /(?:^|[^\d.])(\d{1,7})\s*元(?![年月周天])/i.exec(t);
  if (cnyYuanInt) {
    const n = Number.parseFloat(cnyYuanInt[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0 && n < 1e7) return { amount: n, currencyCode: 'CNY' };
  }

  const kuai = /(?:^|[^\d.])(\d+(?:\.\d{1,2})?)\s*块(?:钱)?(?:\s|$|，|,|。)/.exec(t);
  if (kuai) {
    const n = Number.parseFloat(kuai[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return { amount: n, currencyCode: 'CNY' };
  }

  return null;
}

/** yyyy-MM-dd in body, or common written forms (US). */
export function extractNextChargeDate(text: string, reference: Date): string | null {
  const iso = /\b(20\d{2}-\d{2}-\d{2})\b/.exec(text);
  if (iso) {
    const d = parse(iso[1]!, 'yyyy-MM-dd', reference);
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  const us = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(20\d{2})\b/i.exec(
    text,
  );
  if (us) {
    const tryStr = `${us[1]} ${us[2]}, ${us[3]}`;
    const d = parse(tryStr, 'MMM d, yyyy', reference);
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  const cnFull = /(20\d{2})年(\d{1,2})月(\d{1,2})日/.exec(text);
  if (cnFull) {
    const ds = `${cnFull[1]}-${cnFull[2]!.padStart(2, '0')}-${cnFull[3]!.padStart(2, '0')}`;
    const d = parse(ds, 'yyyy-MM-dd', reference);
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  const cnShort = /(?:^|[^\d年])(\d{1,2})月(\d{1,2})日/.exec(text);
  if (cnShort) {
    const y = reference.getFullYear();
    const ds = `${y}-${cnShort[1]!.padStart(2, '0')}-${cnShort[2]!.padStart(2, '0')}`;
    const d = parse(ds, 'yyyy-MM-dd', reference);
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  return null;
}

export function guessBillingCycleFromText(text: string): BillingCycle {
  const low = text.toLowerCase();
  if (/\bweekly\b|每周|每周扣款/.test(low)) return 'weekly';
  if (/\bannual\b|\byearly\b|每年|年付|annual/.test(low)) return 'yearly';
  return 'monthly';
}

export function nameFromSubject(subject: string): string {
  const s = subject
    .replace(/^(\s*re:\s*)+/gi, '')
    .replace(/^\[[^\]]+\]\s*/g, '')
    .replace(/^【[^】]+】\s*/g, '')
    .trim();
  return (s || 'Subscription').slice(0, 80);
}

/** Inferred tag when paste looks like SMS / short billing text but no keyword hit. */
const INFERRED_SMS_KEYWORD = '短信账单';

function looksLikeCnSmsBill(blob: string): boolean {
  if (blob.length > 480) return false;
  if (!/元|块(?:钱)?/i.test(blob)) return false;
  if (/[【].{1,40}[】]/.test(blob)) return true;
  if (
    /(尊敬|您好|用户|尾号|账户|银行卡|支付宝|微信|招行|工行|建行|农行|中行|移动|联通|电信|美团|爱奇艺|腾讯视频|优酷|bilibili|B站)/i.test(
      blob,
    )
  )
    return true;
  if (blob.length <= 140) return true;
  if (/(扣款|扣费|代扣|支付|交易|消费|续费|订阅|会员|包月)/i.test(blob)) return true;
  return false;
}

function computeConfidence(kw: string | null, ac: { amount: number; currencyCode: string } | null, next: string | null): SubscriptionStructuredJsonV1['confidence'] {
  if (kw && ac && next) return 'high';
  if (kw && ac) return 'medium';
  if (kw || ac) return 'low';
  return 'low';
}

function renewalFailureNoAmountHeuristic(blob: string): boolean {
  return /(续费失败|自动续费失败|续费未成功|扣费失败|将停止|停止服务|服务到期|请及时续费|手动续费|renewal failed|auto[- ]?renew\w* failed)/i.test(
    blob,
  );
}

function internalParseSubscriptionBlob(opts: {
  blob: string;
  subjectLineForName: string;
  keywords: string[];
  reference: Date;
  messageId: string;
  notesTag: string;
  notesSnippetSource: string;
  fromHeader?: string;
  /** When true (paste only), allow SMS-shaped text to produce a hint with amount only. */
  allowSmsInfer?: boolean;
}): { structured: SubscriptionStructuredJsonV1; hint: EmailRenewalHint | null } {
  const {
    blob,
    keywords,
    reference,
    messageId,
    notesTag,
    notesSnippetSource,
    fromHeader,
    subjectLineForName,
    allowSmsInfer,
  } = opts;

  let kw = textMatchesSubscriptionKeyword(blob, keywords);
  const acRaw = extractAmountAndCurrency(blob);
  let ac = acRaw;
  if (!kw && ac && allowSmsInfer && looksLikeCnSmsBill(blob)) {
    kw = INFERRED_SMS_KEYWORD;
  }
  const nextFound = extractNextChargeDate(blob, reference);
  if (!ac && kw && nextFound && renewalFailureNoAmountHeuristic(blob)) {
    ac = { amount: 0, currencyCode: 'CNY' };
  }
  const cycle = guessBillingCycleFromText(blob);
  let name = nameFromSubject(subjectLineForName);
  if (fromHeader) {
    const brand = fromHeader.replace(/<[^>]+>/, '').split('@')[0]?.trim();
    if (brand && name.length < 4) name = brand.slice(0, 80);
  }

  const cancelUrl = extractFirstHttpUrl(blob);

  const structured: SubscriptionStructuredJsonV1 = {
    v: 1,
    name,
    amount: ac?.amount ?? null,
    currencyCode: ac?.currencyCode ?? null,
    billingCycle: cycle,
    nextChargeDate: nextFound,
    matchedKeyword: kw,
    confidence: computeConfidence(kw, ac ?? null, nextFound),
    sourceExcerpt: blob.slice(0, 400),
    cancelUrl,
  };

  if (!kw || !ac) {
    return { structured, hint: null };
  }

  const next = nextFound ?? format(addDays(reference, 30), 'yyyy-MM-dd');
  const snippet = notesSnippetSource.slice(0, 280).trim() + (notesSnippetSource.length > 280 ? '…' : '');
  let notes = `${notesTag} ${kw}\n— ${snippet}`;
  if (acRaw === null && ac.amount === 0) {
    notes += '\n（未识别金额，请在新条目里填写实际价格）';
  }

  return {
    structured,
    hint: {
      messageId,
      name,
      amount: ac.amount,
      currencyCode: ac.currencyCode,
      billingCycle: cycle,
      nextChargeDate: next,
      notes,
      matchedKeyword: kw,
      ...(cancelUrl ? { cancelUrl } : {}),
    },
  };
}

/** Paste or Share: one block of text; first line treated as subject when present. */
export function parseSmartImportFromPastedText(
  rawText: string,
  keywords: string[],
  messageId: string,
  reference?: Date,
): { structured: SubscriptionStructuredJsonV1; hint: EmailRenewalHint | null } {
  const ref = reference ?? new Date();
  const text = rawText.trim();
  const subjEnd = text.indexOf('\n');
  const subjectLine = subjEnd >= 0 ? text.slice(0, subjEnd).trim() : text.slice(0, 120).trim() || 'Pasted text';
  const body = subjEnd >= 0 ? text.slice(subjEnd + 1).trim() : text;
  return internalParseSubscriptionBlob({
    blob: text,
    subjectLineForName: subjectLine,
    keywords,
    reference: ref,
    messageId,
    notesTag: 'Paste ·',
    notesSnippetSource: body || text,
    allowSmsInfer: true,
  });
}

/** When strict hint is null (e.g. missing amount) but we still matched subscription-like text, build a form prefilling hint. */
export function pasteStructuredToFormHint(
  structured: SubscriptionStructuredJsonV1,
  messageId: string,
): EmailRenewalHint | null {
  if (!structured.matchedKeyword) return null;
  const ref = new Date();
  const next = structured.nextChargeDate ?? format(addDays(ref, 30), 'yyyy-MM-dd');
  const snippet =
    structured.sourceExcerpt.slice(0, 280).trim() +
    (structured.sourceExcerpt.length > 280 ? '…' : '');
  let notes = `Paste · ${structured.matchedKeyword}\n— ${snippet}`;
  const amount = structured.amount ?? 0;
  const currency = structured.currencyCode ?? 'CNY';
  if (structured.amount == null) {
    notes += '\n（未识别金额，请在新条目里填写）';
  }
  return {
    messageId,
    name: structured.name,
    amount,
    currencyCode: currency,
    billingCycle: structured.billingCycle,
    nextChargeDate: next,
    notes,
    matchedKeyword: structured.matchedKeyword,
    ...(structured.cancelUrl ? { cancelUrl: structured.cancelUrl } : {}),
  };
}

export function buildHintFromEmailParts(opts: {
  messageId: string;
  subject: string;
  snippet: string;
  fromHeader?: string;
  keywords: string[];
  reference?: Date;
}): EmailRenewalHint | null {
  const reference = opts.reference ?? new Date();
  const blob = `${opts.subject}\n${opts.snippet}`;
  const { hint } = internalParseSubscriptionBlob({
    blob,
    subjectLineForName: opts.subject,
    keywords: opts.keywords,
    reference,
    messageId: opts.messageId,
    notesTag: 'Gmail ·',
    notesSnippetSource: opts.snippet,
    fromHeader: opts.fromHeader,
  });
  return hint;
}

/** Same as paste parse but only returns the JSON payload (e.g. copy / Shortcuts). */
export function subscriptionTextToStructuredJson(
  rawText: string,
  keywords: string[],
  reference?: Date,
): SubscriptionStructuredJsonV1 {
  const id = `json-${Date.now()}`;
  return parseSmartImportFromPastedText(rawText, keywords, id, reference).structured;
}
