/** True if the string looks like an http(s) URL (for opening in browser). */
export function looksLikeHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}
