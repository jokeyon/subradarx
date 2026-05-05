/** True if the string looks like an http(s) URL (for opening in browser). */
export function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Strip trailing punctuation often pasted next to URLs (including CJK). */
function trimTrailingUrlJunk(raw: string): string {
  let s = raw.trim();
  const junk = '.,;:!?)\'"。，、」』】';
  while (s.length > 0 && junk.includes(s[s.length - 1]!)) {
    s = s.slice(0, -1).trim();
  }
  return s;
}

function normalizeSmsLinkText(raw: string): string {
  return raw
    .replace(/https：\/\//gi, 'https://')
    .replace(/http：\/\//gi, 'http://');
}

function tryParseHttpHref(candidate: string): string | null {
  const trimmed = trimTrailingUrlJunk(candidate);
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname || !u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * SMS / short-link domains without scheme (e.g. `t.cn/AbCd`, `m.tb.cn/h.xxx`, `www.example.com/path`).
 * Avoids `@foo.com` emails via lookbehind; TLD must be letters only to skip `12.34`-style decimals.
 */
const SCHEMELESS_URL =
  /(?<![@＠\w/])((?:www\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[a-zA-Z0-9\-._~%!$&'()*+,;=:@/?#]*)?)/gi;

/**
 * First plausible http(s) URL in free text (e.g. subscription name pasted with a link).
 * Handles explicit `http(s)://` URLs, fullwidth colons, and common scheme-less short links in SMS.
 */
export function extractFirstHttpUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = normalizeSmsLinkText(text);

  const withScheme = /https?:\/\/[^\s<>"{}|\\^[\]()（）「」【】]+/gi;
  let m: RegExpExecArray | null;
  withScheme.lastIndex = 0;
  while ((m = withScheme.exec(normalized)) !== null) {
    const href = tryParseHttpHref(m[0]);
    if (href) return href;
  }

  SCHEMELESS_URL.lastIndex = 0;
  while ((m = SCHEMELESS_URL.exec(normalized)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    const candidate = `https://${raw}`;
    const href = tryParseHttpHref(candidate);
    if (href) return href;
  }

  return null;
}
