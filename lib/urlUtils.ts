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

/**
 * First plausible http(s) URL in free text (e.g. subscription name pasted with a link).
 * Returns normalized href or null. Does not match bare `www.` without scheme.
 */
export function extractFirstHttpUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const re = /https?:\/\/[^\s<>"{}|\\^[\]()（）「」【】]+/gi;
  const m = re.exec(text);
  if (!m) return null;
  let candidate = trimTrailingUrlJunk(m[0]);
  if (!looksLikeHttpUrl(candidate)) return null;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}
