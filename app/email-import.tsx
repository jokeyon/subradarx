import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GmailImportSection } from '@/components/email-import/GmailImportSection';
import { useI18n } from '@/contexts/I18nContext';
import { GMAIL_IMPORT_ENABLED } from '@/lib/constants';
import { loadCustomKeywords, loadImportedGmailMessageIds, saveCustomKeywordsCsv } from '@/lib/gmailImportStorage';
import { readShareInboxPayload } from '@/lib/shareInbox';
import {
  DEFAULT_SUBSCRIPTION_KEYWORDS,
  type EmailRenewalHint,
  type SubscriptionStructuredJsonV1,
  parseSmartImportFromPastedText,
  pasteStructuredToFormHint,
} from '@/lib/subscriptionEmailParser';

const PASTE_DRAFT_STORAGE_KEY = 'subradax-email-import-paste-draft';
const LOCAL_PASTE_MESSAGE_ID = 'local-paste';

export default function EmailImportScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ shareText?: string; shareInbox?: string; shareTs?: string }>();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);
  /** Prevents async keyword hydration from overwriting in-progress edits (incl. React Strict Mode double-mount). */
  const keywordsUserEditedRef = useRef(false);

  const leaveEmailImport = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)/hub');
    }
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nav.emailImport'),
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={leaveEmailImport}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel={t('form.goBack')}
        >
          <Ionicons name="chevron-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, t, leaveEmailImport]);

  useFocusEffect(
    useCallback(() => {
      void loadImportedGmailMessageIds().then((s) => setImported(s));
    }, []),
  );

  const [keywordCsv, setKeywordCsv] = useState('');
  const [paste, setPaste] = useState('');
  const [hints, setHints] = useState<EmailRenewalHint[]>([]);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [lastStructured, setLastStructured] = useState<SubscriptionStructuredJsonV1 | null>(null);
  const [pasteOpenableHint, setPasteOpenableHint] = useState<EmailRenewalHint | null>(null);

  const keywords = useMemo(
    () => [...DEFAULT_SUBSCRIPTION_KEYWORDS, ...keywordCsv.split(/[,，\n]/).map((x) => x.trim()).filter(Boolean)],
    [keywordCsv],
  );

  useEffect(() => {
    void AsyncStorage.getItem(PASTE_DRAFT_STORAGE_KEY).then((v) => {
      if (typeof v !== 'string' || !v.length) return;
      setPaste((prev) => (prev.length > 0 ? prev : v));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadCustomKeywords().then((cust) => {
      if (cancelled || keywordsUserEditedRef.current) return;
      if (cust.length) setKeywordCsv(cust.join(', '));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const inbox = params.shareInbox === '1';
    const direct = typeof params.shareText === 'string' && params.shareText.length > 0;
    if (!inbox && !direct) return;

    const ac = new AbortController();

    void (async () => {
      let text = '';
      if (inbox) {
        const t0 = await readShareInboxPayload();
        text = t0?.trim() ?? '';
      } else if (direct) {
        try {
          text = decodeURIComponent(params.shareText as string).trim();
        } catch {
          text = String(params.shareText).trim();
        }
      }

      if (ac.signal.aborted) return;

      if (!text) {
        if (inbox) Alert.alert(t('common.hint'), t('emailImport.shareInboxEmpty'));
        return;
      }

      setPaste(text);
      router.setParams({ shareText: undefined, shareInbox: undefined, shareTs: undefined });
    })();

    return () => ac.abort();
  }, [params.shareInbox, params.shareText, params.shareTs, router, t]);

  const openPrefill = useCallback(
    (hint: EmailRenewalHint, opts?: { skipAmount?: boolean; clearPasteDraft?: boolean }) => {
      if (opts?.clearPasteDraft) {
        setPaste('');
        void AsyncStorage.removeItem(PASTE_DRAFT_STORAGE_KEY);
      }
      const cu = hint.cancelUrl?.trim();
      router.push({
        pathname: '/subscription/new',
        params: {
          prefName: hint.name,
          ...(opts?.skipAmount ? {} : { prefAmount: String(hint.amount) }),
          prefCurrency: hint.currencyCode,
          prefNotes: hint.notes,
          prefNext: hint.nextChargeDate,
          prefCycle: hint.billingCycle,
          ...(cu ? { prefCancelUrl: cu } : {}),
          ...(hint.messageId.startsWith('local-') ? {} : { gmailMessageId: hint.messageId }),
        },
      });
    },
    [router],
  );

  /** Debounced parse for paste/share text only updates UI — user confirms via the card (avoids repeat auto-navigation). */
  useEffect(() => {
    const tmr = setTimeout(() => {
      const text = paste.trim();
      if (!text) {
        setLastStructured(null);
        setPasteOpenableHint(null);
        setHints((h) => h.filter((x) => !x.messageId.startsWith('local-')));
        return;
      }
      const { structured, hint } = parseSmartImportFromPastedText(
        text,
        keywords,
        LOCAL_PASTE_MESSAGE_ID,
      );
      setLastStructured(structured);
      setHints((h) => h.filter((x) => !x.messageId.startsWith('local-')));

      const openable =
        hint ?? pasteStructuredToFormHint(structured, LOCAL_PASTE_MESSAGE_ID);
      const usable = openable && structured.matchedKeyword ? openable : null;
      setPasteOpenableHint(usable);
    }, 480);
    return () => clearTimeout(tmr);
  }, [paste, keywords]);

  const onSaveKeywords = useCallback(() => {
    void saveCustomKeywordsCsv(keywordCsv);
    Alert.alert(t('common.hint'), t('emailImport.keywordsSaved'));
  }, [keywordCsv, t]);

  const introKey = GMAIL_IMPORT_ENABLED ? 'emailImport.intro' : 'emailImport.introNoGmail';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{t(introKey)}</Text>

        <Text style={styles.label}>{t('emailImport.keywordsLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('emailImport.keywordsPlaceholder')}
          placeholderTextColor="#64748B"
          value={keywordCsv}
          onChangeText={(v) => {
            keywordsUserEditedRef.current = true;
            setKeywordCsv(v);
          }}
        />
        <Pressable style={styles.btnSecondary} onPress={onSaveKeywords}>
          <Text style={styles.btnSecondaryText}>{t('emailImport.saveKeywords')}</Text>
        </Pressable>

        {GMAIL_IMPORT_ENABLED ? <GmailImportSection keywords={keywords} t={t} setHints={setHints} /> : null}

        <Text style={styles.label}>{t('emailImport.pasteLabel')}</Text>
        <Text style={styles.smartBlurb}>{t('emailImport.smartBlurb')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholderTextColor="#64748B"
          placeholder={t('emailImport.pastePlaceholder')}
          value={paste}
          onChangeText={(v) => {
            setPaste(v);
            void AsyncStorage.setItem(PASTE_DRAFT_STORAGE_KEY, v);
          }}
          onFocus={() => {
            requestAnimationFrame(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            });
          }}
          multiline
        />

        {pasteOpenableHint && lastStructured ? (
          <View style={styles.parseCard}>
            <Text style={styles.parseCardTitle}>{t('emailImport.parseReadyTitle')}</Text>
            <Text style={styles.parseMeta}>
              {t('emailImport.confidence', { level: lastStructured.confidence })}
            </Text>
            <Text style={styles.parseMeta} numberOfLines={4}>
              {lastStructured.name}
              {lastStructured.amount != null
                ? ` · ${lastStructured.amount} ${lastStructured.currencyCode ?? ''}`
                : ` · ${t('emailImport.amountPending')}`}{' '}
              · {lastStructured.nextChargeDate ?? t('emailImport.dateUnknown')} · {lastStructured.billingCycle}
            </Text>
            <Text style={styles.parseKw}>
              {t('emailImport.matched', { kw: lastStructured.matchedKeyword ?? '—' })}
            </Text>
            <Pressable
              style={styles.btnPrimary}
              onPress={() => {
                if (!pasteOpenableHint) return;
                openPrefill(pasteOpenableHint, {
                  skipAmount: lastStructured.amount == null,
                  clearPasteDraft: true,
                });
              }}
            >
              <Text style={styles.btnPrimaryText}>{t('emailImport.createRenewal')}</Text>
            </Pressable>
          </View>
        ) : null}

        {hints.map((item) => {
          const done = imported.has(item.messageId);
          return (
            <View key={item.messageId} style={styles.row}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.amount} {item.currencyCode} · {item.nextChargeDate} · {item.billingCycle}
              </Text>
              <Text style={styles.rowKw}>{t('emailImport.matched', { kw: item.matchedKeyword })}</Text>
              <Pressable
                style={[styles.btnSmall, done && styles.rowBtnDisabled]}
                disabled={done}
                onPress={() => openPrefill(item)}
              >
                <Text style={styles.btnSmallText}>
                  {done ? t('emailImport.importedBadge') : t('emailImport.add')}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBack: {
    paddingLeft: Platform.OS === 'ios' ? 8 : 4,
    paddingRight: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screen: { flex: 1, backgroundColor: '#0B1220' },
  scroll: { padding: 16, paddingBottom: 120, flexGrow: 1 },
  intro: { color: '#94A3B8', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  btnSecondary: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4338CA',
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#A5B4FC', fontWeight: '700' },
  row: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  rowTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  rowMeta: { color: '#CBD5E1', fontSize: 13 },
  rowKw: { color: '#64748B', fontSize: 12 },
  smartBlurb: { color: '#64748B', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  parseCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#312E81',
    gap: 8,
  },
  parseCardTitle: { color: '#C7D2FE', fontSize: 13, fontWeight: '700' },
  parseMeta: { color: '#94A3B8', fontSize: 12 },
  parseKw: { color: '#64748B', fontSize: 12 },
  btnPrimary: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#F8FAFC', fontWeight: '700', fontSize: 16 },
  btnSmall: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#312E81',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rowBtnDisabled: { opacity: 0.45 },
  btnSmallText: { color: '#EEF2FF', fontWeight: '700', fontSize: 14 },
});
