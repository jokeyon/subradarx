import type { InitialProps } from 'expo-share-extension';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { close, openHostApp, Text, View } from 'expo-share-extension';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { writeShareInboxPayload } from '@/lib/shareInbox';

/** Try opening the host app from the extension (dev client often registers exp+slug only). */
async function openHostDeepLink(pathWithQuery: string): Promise<boolean> {
  const cfg = Constants.expoConfig;
  if (!cfg) return false;

  const mainScheme =
    typeof cfg.scheme === 'string' ? cfg.scheme : Array.isArray(cfg.scheme) ? cfg.scheme[0] : 'subradax';
  const slug = cfg.slug ?? 'subradar';
  const bundleId = cfg.ios?.bundleIdentifier ?? '';

  const qIndex = pathWithQuery.indexOf('?');
  const pathPart = (qIndex === -1 ? pathWithQuery : pathWithQuery.slice(0, qIndex)).replace(/^\//, '');
  const queryPart = qIndex === -1 ? '' : pathWithQuery.slice(qIndex);
  const q = queryPart;

  const candidates = [
    `${mainScheme}://${pathPart}${q}`,
    `${mainScheme}:///${pathPart}${q}`,
    `exp+${slug}://${pathPart}${q}`,
  ];
  if (bundleId) candidates.push(`${bundleId}://${pathPart}${q}`);

  const urls = [...new Set(candidates)];
  for (const url of urls) {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function buildPayload(text: string | undefined, url: string | undefined): string {
  const lines: string[] = [];
  if (url) lines.push(url);
  if (text) {
    if (lines.length) lines.push('');
    lines.push(text);
  }
  return lines.join('\n').trim();
}

export default function ShareExtension(props: InitialProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => buildPayload(props.text, props.url), [props.text, props.url]);
  const preview = useMemo(() => (payload.length > 280 ? `${payload.slice(0, 280)}…` : payload), [payload]);

  const onCancel = useCallback(() => {
    setError(null);
    close();
  }, []);

  const onOpenHost = useCallback(async () => {
    if (!payload) {
      close();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      writeShareInboxPayload(payload);
      const primary = 'email-import?shareInbox=1';
      if (!(await openHostDeepLink(primary))) openHostApp(primary);
      else close();
    } catch {
      try {
        const fallback = `email-import?shareText=${encodeURIComponent(payload.slice(0, 2500))}`;
        if (!(await openHostDeepLink(fallback))) openHostApp(fallback);
        else close();
      } catch {
        setError('Could not hand off text. Try Paste in subradax instead.');
        setBusy(false);
      }
    }
  }, [payload]);

  return (
    <View style={styles.root}>
      <Text style={styles.title} allowFontScaling={false}>
        subradax
      </Text>
      <Text style={styles.sub} allowFontScaling={false}>
        Smart import (on-device)
      </Text>
      {!payload ? (
        <Text style={styles.hint} allowFontScaling={false}>
          No text or link in this share. Open a billing email, select text, then share.
        </Text>
      ) : (
        <Text style={styles.preview} allowFontScaling={false}>
          {preview}
        </Text>
      )}
      {error ? (
        <Text style={styles.err} allowFontScaling={false}>
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCancel} disabled={busy}>
          <Text style={styles.btnGhostText} allowFontScaling={false}>
            Cancel
          </Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnPrimary, !payload && styles.btnDisabled]} onPress={() => void onOpenHost()} disabled={busy || !payload}>
          {busy ? <ActivityIndicator color="#fff" /> : null}
          {!busy ? (
            <Text style={styles.btnPrimaryText} allowFontScaling={false}>
              Open in subradax
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#0B1220',
  },
  title: { color: '#EEF2FF', fontSize: 18, fontWeight: '800' },
  sub: { color: '#94A3B8', fontSize: 13, marginTop: 4, marginBottom: 12 },
  hint: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },
  preview: { color: '#CBD5E1', fontSize: 13, lineHeight: 18, flex: 1 },
  err: { color: '#FCA5A5', fontSize: 13, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnGhost: { borderWidth: 1, borderColor: '#4338CA' },
  btnGhostText: { color: '#A5B4FC', fontWeight: '700' },
  btnPrimary: { backgroundColor: '#6366F1' },
  btnDisabled: { opacity: 0.45 },
  btnPrimaryText: { color: '#fff', fontWeight: '800' },
});
