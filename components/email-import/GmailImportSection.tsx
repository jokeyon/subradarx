import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { EmailRenewalHint } from '@/lib/subscriptionEmailParser';
import { buildHintFromEmailParts } from '@/lib/subscriptionEmailParser';
import {
  clearGmailAccessToken,
  getGmailAccessToken,
  loadImportedGmailMessageIds,
  saveGmailAccessToken,
} from '@/lib/gmailImportStorage';
import { gmailGetMessageSnippet, gmailListRecentMessageIds } from '@/lib/gmailMessages';

WebBrowser.maybeCompleteAuthSession();

function googleExtra(): { ios: string; android: string; web: string } {
  const ex = Constants.expoConfig?.extra as
    | {
        googleIosClientId?: string;
        googleAndroidClientId?: string;
        googleWebClientId?: string;
      }
    | undefined;
  return {
    ios: (ex?.googleIosClientId ?? '').trim(),
    android: (ex?.googleAndroidClientId ?? '').trim(),
    web: (ex?.googleWebClientId ?? '').trim(),
  };
}

function hasGoogleClientsConfigured(): boolean {
  const g = googleExtra();
  if (Platform.OS === 'ios') return g.ios.length > 10 && g.web.length > 10;
  if (Platform.OS === 'android') return g.android.length > 10 && g.web.length > 10;
  return g.web.length > 10;
}

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  keywords: string[];
  t: TFn;
  setHints: Dispatch<SetStateAction<EmailRenewalHint[]>>;
};

export function GmailImportSection({ keywords, t, setHints }: Props) {
  const g = googleExtra();
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: g.ios || 'placeholder.apps.googleusercontent.com',
    androidClientId: g.android || 'placeholder.apps.googleusercontent.com',
    webClientId: g.web || 'placeholder.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  });

  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = hasGoogleClientsConfigured();

  useEffect(() => {
    void getGmailAccessToken().then(setToken);
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const at =
      response.authentication?.accessToken ??
      (response.params && 'access_token' in response.params
        ? String((response.params as { access_token?: string }).access_token)
        : null);
    if (at) {
      void saveGmailAccessToken(at).then(() => setToken(at));
    }
  }, [response]);

  const onDisconnect = useCallback(() => {
    void clearGmailAccessToken().then(() => setToken(null));
  }, []);

  const onScanGmail = useCallback(async () => {
    if (!token) {
      Alert.alert(t('common.hint'), t('emailImport.connect'));
      return;
    }
    setBusy(true);
    setHints([]);
    try {
      const imp = await loadImportedGmailMessageIds();
      const ids = await gmailListRecentMessageIds(token, 40);
      const next: EmailRenewalHint[] = [];
      for (const id of ids) {
        if (imp.has(id)) continue;
        const msg = await gmailGetMessageSnippet(token, id);
        const hint = buildHintFromEmailParts({
          messageId: id,
          subject: msg.subject,
          snippet: msg.snippet,
          fromHeader: msg.from,
          keywords,
        });
        if (hint) next.push(hint);
      }
      setHints(next);
      if (next.length === 0) {
        Alert.alert(t('common.hint'), t('emailImport.empty'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/401|403/.test(msg)) {
        await clearGmailAccessToken();
        setToken(null);
      }
      Alert.alert(t('emailImport.err'), msg.slice(0, 400));
    } finally {
      setBusy(false);
    }
  }, [token, keywords, t, setHints]);

  return (
    <>
      {!configured ? <Text style={styles.warn}>{t('emailImport.noClientIds')}</Text> : null}

      {configured ? (
        <>
          <Pressable
            style={[styles.btn, !request && styles.btnDisabled]}
            disabled={!request || busy}
            onPress={() => void promptAsync()}
          >
            <Text style={styles.btnText}>{t('emailImport.connect')}</Text>
          </Pressable>
          {token ? (
            <>
              <Pressable style={styles.btnSecondary} onPress={onDisconnect}>
                <Text style={styles.btnSecondaryText}>{t('emailImport.disconnect')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => void onScanGmail()}
              >
                <Text style={styles.btnText}>{t('emailImport.scan')}</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}
      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color="#A5B4FC" />
          <Text style={styles.busyText}>{t('emailImport.busy')}</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  warn: { color: '#FBBF24', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  btn: {
    marginTop: 12,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnSecondary: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4338CA',
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#A5B4FC', fontWeight: '700' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  busyText: { color: '#94A3B8' },
});
