import { useCallback, useEffect, useRef } from 'react';
import { extractFirstHttpUrl } from '@/lib/urlUtils';

/**
 * Auto-fill cancelUrl from http(s) in `name` (debounced). If the user clears the cancel URL field,
 * suppress re-fill until the extracted URL in `name` changes or they type a non-empty cancel URL.
 *
 * @param resetKey — e.g. renewal id or `'new'`; when it changes, suppression resets for a fresh form.
 */
export function useNameDerivedCancelUrl(
  name: string,
  cancelUrl: string,
  setCancelUrl: (value: string) => void,
  resetKey: string,
) {
  const cancelUrlRef = useRef(cancelUrl);
  cancelUrlRef.current = cancelUrl;
  const suppressRef = useRef(false);
  const prevExtractRef = useRef<string | null>(null);

  useEffect(() => {
    suppressRef.current = false;
    prevExtractRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    const cur = extractFirstHttpUrl(name);
    if (cur !== prevExtractRef.current) {
      prevExtractRef.current = cur;
      suppressRef.current = false;
    }
  }, [name]);

  useEffect(() => {
    const id = setTimeout(() => {
      const fromName = extractFirstHttpUrl(name);
      if (fromName && !cancelUrlRef.current.trim() && !suppressRef.current) {
        setCancelUrl(fromName);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [name, setCancelUrl]);

  const onCancelUrlChange = useCallback(
    (text: string) => {
      if (text.trim() === '' && cancelUrlRef.current.trim() !== '') {
        suppressRef.current = true;
      }
      if (text.trim() !== '') {
        suppressRef.current = false;
      }
      setCancelUrl(text);
    },
    [setCancelUrl],
  );

  const mergeCancelUrlOnSave = useCallback((fieldTrimmed: string, trimmedName: string) => {
    if (fieldTrimmed) return fieldTrimmed;
    if (suppressRef.current) return '';
    return extractFirstHttpUrl(trimmedName) || '';
  }, []);

  return { onCancelUrlChange, mergeCancelUrlOnSave };
}
