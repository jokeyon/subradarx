import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, parse, startOfDay } from 'date-fns';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CurrencyPickerField } from '@/components/CurrencyPickerField';
import { useI18n } from '@/contexts/I18nContext';
import { useSubRadar } from '@/contexts/SubRadarContext';
import { intlLocaleTag } from '@/lib/formatDates';
import { normalizeCurrencyCodeForIntl } from '@/lib/formatCurrency';
import { markGmailMessageImported } from '@/lib/gmailImportStorage';
import type { BillingCycle } from '@/lib/types';
import { useNameDerivedCancelUrl } from '@/lib/useNameDerivedCancelUrl';
import { extractFirstHttpUrl, looksLikeHttpUrl } from '@/lib/urlUtils';

const cycles: BillingCycle[] = ['weekly', 'monthly', 'yearly'];
const reminderValues = [0, 1, 3, 7] as const;

function reminderLabel(t: (k: string) => string, value: number): string {
  switch (value) {
    case 0:
      return t('reminder.sameDay');
    case 1:
      return t('reminder.oneDay');
    case 3:
      return t('reminder.threeDays');
    case 7:
      return t('reminder.sevenDays');
    default:
      return String(value);
  }
}

export default function NewRenewalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefName?: string;
    prefAmount?: string;
    prefCurrency?: string;
    prefNotes?: string;
    prefNext?: string;
    prefCycle?: string;
    gmailMessageId?: string;
  }>();
  const navigation = useNavigation();
  const { t, locale } = useI18n();
  const intlTag = intlLocaleTag(locale);
  const { addRenewal } = useSubRadar();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [next, setNext] = useState(startOfDay(new Date()));
  const [pickerOpen, setPickerOpen] = useState(Platform.OS === 'ios');
  const [reminderDays, setReminderDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [cancelUrl, setCancelUrl] = useState('');
  const { onCancelUrlChange, mergeCancelUrlOnSave } = useNameDerivedCancelUrl(
    name,
    cancelUrl,
    setCancelUrl,
    'new',
  );

  useEffect(() => {
    if (params.prefName) setName(String(params.prefName));
    if (params.prefAmount) setAmount(String(params.prefAmount));
    if (params.prefCurrency) setCurrencyCode(String(params.prefCurrency).toUpperCase());
    if (params.prefNotes) setNotes(String(params.prefNotes));
    if (params.prefNext && /^\d{4}-\d{2}-\d{2}$/.test(String(params.prefNext))) {
      setNext(startOfDay(parse(String(params.prefNext), 'yyyy-MM-dd', new Date())));
    }
    if (params.prefCycle === 'weekly' || params.prefCycle === 'monthly' || params.prefCycle === 'yearly') {
      setCycle(params.prefCycle);
    }
  }, [params.prefName, params.prefAmount, params.prefCurrency, params.prefNotes, params.prefNext, params.prefCycle]);

  const closeModal = useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/hub');
    }
  }, [router]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('nav.newRenewal') });
  }, [navigation, t]);

  const urlInName = useMemo(() => extractFirstHttpUrl(name), [name]);

  const openHttpUrl = async (raw: string) => {
    const u = raw.trim();
    if (!looksLikeHttpUrl(u)) {
      Alert.alert(t('common.hint'), t('form.errorCancelUrl'));
      return;
    }
    const ok = await Linking.canOpenURL(u);
    if (!ok) {
      Alert.alert(t('common.hint'), t('form.errorCancelUrl'));
      return;
    }
    await Linking.openURL(u);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('common.hint'), t('form.errorName'));
      return;
    }
    const n = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(n)) {
      Alert.alert(t('common.hint'), t('form.errorAmount'));
      return;
    }
    const url = mergeCancelUrlOnSave(cancelUrl.trim(), trimmed);
    await addRenewal({
      name: trimmed,
      amount: n,
      currencyCode: normalizeCurrencyCodeForIntl(currencyCode),
      billingCycle: cycle,
      nextChargeDate: format(startOfDay(next), 'yyyy-MM-dd'),
      reminderDays,
      notes: notes.trim(),
      ...(url ? { cancelUrl: url } : {}),
    });
    const gmid = params.gmailMessageId ? String(params.gmailMessageId) : '';
    if (gmid) await markGmailMessageImported(gmid);
    closeModal();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.smartImportLink} onPress={() => router.push('/email-import')}>
        <Text style={styles.smartImportLinkText}>{t('renewals.addSmartImport')} →</Text>
      </Pressable>
      <Text style={styles.label}>{t('form.name')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('form.namePh')}
        placeholderTextColor="#64748B"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.fieldHint}>{t('form.nameUrlAutoFillHint')}</Text>
      {urlInName && urlInName !== cancelUrl.trim() ? (
        <Pressable
          style={styles.nameLinkTap}
          onPress={() => void openHttpUrl(urlInName)}
          accessibilityRole="link"
          accessibilityLabel={`${t('form.openLinkShort')}: ${urlInName}`}
        >
          <Text style={styles.nameLinkTapTitle}>
            {t('form.openLinkShort')} →
          </Text>
          <Text style={styles.nameLinkTapUrl} numberOfLines={1} ellipsizeMode="middle">
            {urlInName}
          </Text>
        </Pressable>
      ) : null}
      <Text style={styles.label}>{t('form.amount')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('form.amountPh')}
        placeholderTextColor="#64748B"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Text style={styles.label}>{t('form.currency')}</Text>
      <CurrencyPickerField
        value={currencyCode}
        onChange={setCurrencyCode}
        localeTag={intlTag}
        title={t('form.currencyPickTitle')}
        dismissLabel={t('common.dismiss')}
        triggerStyle={styles.input}
      />
      <Text style={styles.label}>{t('form.billingCycle')}</Text>
      <View style={styles.chips}>
        {cycles.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCycle(c)}
            style={[styles.chip, cycle === c && styles.chipOn]}
          >
            <Text style={[styles.chipText, cycle === c && styles.chipTextOn]}>{t(`billingCycle.${c}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{t('form.nextCharge')}</Text>
      {Platform.OS === 'android' ? (
        <>
          <Pressable style={styles.inputLike} onPress={() => setPickerOpen(true)}>
            <Text style={styles.inputLikeText}>{next.toDateString()}</Text>
          </Pressable>
          {pickerOpen ? (
            <DateTimePicker
              value={next}
              mode="date"
              display="default"
              onChange={(_, d) => {
                setPickerOpen(false);
                if (d) setNext(startOfDay(d));
              }}
            />
          ) : null}
        </>
      ) : (
        <DateTimePicker
          value={next}
          mode="date"
          display="spinner"
          themeVariant="dark"
          onChange={(_, d) => {
            if (d) setNext(startOfDay(d));
          }}
        />
      )}
      <Text style={styles.label}>{t('form.remindMe')}</Text>
      <View style={styles.chips}>
        {reminderValues.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReminderDays(r)}
            style={[styles.chip, reminderDays === r && styles.chipOn]}
          >
            <Text style={[styles.chipText, reminderDays === r && styles.chipTextOn]}>
              {reminderLabel(t, r)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{t('form.notes')}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('form.notesPh')}
        placeholderTextColor="#64748B"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Text style={styles.label}>{t('form.cancelUrl')}</Text>
      <Text style={styles.fieldHint}>{t('form.cancelUrlHint')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('form.cancelUrlPh')}
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={cancelUrl}
        onChangeText={onCancelUrlChange}
      />
      {looksLikeHttpUrl(cancelUrl.trim()) ? (
        <Pressable style={styles.secondary} onPress={() => void openHttpUrl(cancelUrl)}>
          <Text style={styles.secondaryText}>{t('form.openCancelLink')}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.save} onPress={() => void save()}>
        <Text style={styles.saveText}>{t('form.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, paddingBottom: 40 },
  smartImportLink: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  smartImportLinkText: { color: '#A5B4FC', fontSize: 14, fontWeight: '600' },
  label: { color: '#94A3B8', marginBottom: 6, marginTop: 12, fontSize: 13, fontWeight: '600' },
  fieldHint: { color: '#64748B', fontSize: 12, lineHeight: 17, marginBottom: 8, marginTop: -2 },
  nameLinkTap: {
    alignSelf: 'stretch',
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  nameLinkTapTitle: { color: '#A5B4FC', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  nameLinkTapUrl: { color: '#64748B', fontSize: 12, lineHeight: 16, marginTop: 2 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  inputLike: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  inputLikeText: { color: '#F8FAFC' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chipOn: { backgroundColor: '#312E81', borderColor: '#6366F1' },
  chipText: { color: '#94A3B8' },
  chipTextOn: { color: '#EEF2FF', fontWeight: '600' },
  save: {
    marginTop: 24,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#E2E8F0', fontWeight: '700' },
});
