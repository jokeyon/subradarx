import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { format, parse, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CurrencyPickerField } from '@/components/CurrencyPickerField';
import { useI18n } from '@/contexts/I18nContext';
import { useSubRadar } from '@/contexts/SubRadarContext';
import { advanceNextCharge } from '@/lib/renewalMath';
import type { BillingCycle } from '@/lib/types';
import { looksLikeHttpUrl } from '@/lib/urlUtils';
import { normalizeCurrencyCodeForIntl } from '@/lib/formatCurrency';
import { intlLocaleTag } from '@/lib/formatDates';

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

export default function EditRenewalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { t, locale } = useI18n();
  const intlTag = intlLocaleTag(locale);
  const { renewals, updateRenewal, deleteRenewal, loading } = useSubRadar();

  const existing = useMemo(() => renewals.find((r) => r.id === id), [renewals, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [currencyCode, setCurrencyCode] = useState(existing?.currencyCode ?? 'USD');
  const [cycle, setCycle] = useState<BillingCycle>(existing?.billingCycle ?? 'monthly');
  const [next, setNext] = useState(
    startOfDay(existing ? parse(existing.nextChargeDate, 'yyyy-MM-dd', new Date()) : new Date()),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reminderDays, setReminderDays] = useState(existing?.reminderDays ?? 3);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [cancelUrl, setCancelUrl] = useState(existing?.cancelUrl ?? '');

  const scrollRef = useRef<ScrollView>(null);

  /** Prefer React Navigation stack pop — router.canGoBack() is unreliable on this stack. */
  const leaveEdit = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(tabs)/hub');
    }
  }, [navigation, router]);

  const editHeaderOptions = useMemo(
    () => ({
      title: t('nav.editRenewal'),
      headerShown: true,
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={leaveEdit}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel={t('form.goBack')}
        >
          <Ionicons name="chevron-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
      ),
    }),
    [t, leaveEdit],
  );

  const requiredFilled = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const n = Number.parseFloat(amount.replace(',', '.'));
    return Number.isFinite(n);
  }, [name, amount]);

  const prevRequiredFilled = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevRequiredFilled.current === null) {
      prevRequiredFilled.current = requiredFilled;
      return;
    }
    if (requiredFilled && !prevRequiredFilled.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    }
    prevRequiredFilled.current = requiredFilled;
  }, [requiredFilled]);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setAmount(String(existing.amount));
    setCurrencyCode(existing.currencyCode);
    setCycle(existing.billingCycle);
    setNext(startOfDay(parse(existing.nextChargeDate, 'yyyy-MM-dd', new Date())));
    setReminderDays(existing.reminderDays);
    setNotes(existing.notes);
    setCancelUrl(existing.cancelUrl ?? '');
  }, [existing]);

  if (loading && !existing) {
    return (
      <>
        <Stack.Screen options={editHeaderOptions} />
        <View style={styles.missing}>
          <Text style={styles.missingText}>{t('edit.loading')}</Text>
        </View>
      </>
    );
  }

  if (!existing) {
    return (
      <>
        <Stack.Screen options={editHeaderOptions} />
        <View style={styles.missing}>
          <Text style={styles.missingText}>{t('edit.notFound')}</Text>
          <Pressable style={styles.save} onPress={leaveEdit}>
            <Text style={styles.saveText}>{t('form.goBack')}</Text>
          </Pressable>
        </View>
      </>
    );
  }

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
    const url = cancelUrl.trim();
    await updateRenewal({
      ...existing,
      name: trimmed,
      amount: n,
      currencyCode: normalizeCurrencyCodeForIntl(currencyCode),
      billingCycle: cycle,
      nextChargeDate: format(startOfDay(next), 'yyyy-MM-dd'),
      reminderDays,
      notes: notes.trim(),
      cancelUrl: url || undefined,
    });
    leaveEdit();
  };

  const markRenewed = async () => {
    const iso = advanceNextCharge(format(startOfDay(next), 'yyyy-MM-dd'), cycle);
    await updateRenewal({
      ...existing,
      nextChargeDate: iso,
    });
    leaveEdit();
  };

  const openCancelUrl = async () => {
    const u = cancelUrl.trim();
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

  const remove = () => {
    Alert.alert(t('edit.deleteTitle'), existing.name, [
      { text: t('edit.cancel'), style: 'cancel' },
      {
        text: t('form.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteRenewal(existing.id).then(() => leaveEdit());
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={editHeaderOptions} />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.label}>{t('form.name')}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor="#64748B"
      />
      <Text style={styles.label}>{t('form.amount')}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholderTextColor="#64748B"
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
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholderTextColor="#64748B"
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
        onChangeText={setCancelUrl}
      />
      {looksLikeHttpUrl(cancelUrl) ? (
        <Pressable style={styles.secondary} onPress={() => void openCancelUrl()}>
          <Text style={styles.secondaryText}>{t('form.openCancelLink')}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.save} onPress={() => void save()}>
        <Text style={styles.saveText}>{t('form.save')}</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => void markRenewed()}>
        <Text style={styles.secondaryText}>{t('form.markRenewed')}</Text>
      </Pressable>
      <Pressable style={styles.danger} onPress={remove}>
        <Text style={styles.dangerText}>{t('form.delete')}</Text>
      </Pressable>
    </ScrollView>
    </>
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
  content: { padding: 16, paddingBottom: 40 },
  missing: { flex: 1, backgroundColor: '#0B1220', padding: 24, justifyContent: 'center' },
  missingText: { color: '#94A3B8', textAlign: 'center', marginBottom: 16 },
  label: { color: '#94A3B8', marginBottom: 6, marginTop: 12, fontSize: 13, fontWeight: '600' },
  fieldHint: { color: '#64748B', fontSize: 12, lineHeight: 17, marginBottom: 8, marginTop: -2 },
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
  danger: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  dangerText: { color: '#F87171', fontWeight: '700' },
});
