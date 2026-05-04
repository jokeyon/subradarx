import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { parse } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useI18n } from '@/contexts/I18nContext';
import { useSubRadar } from '@/contexts/SubRadarContext';
import { FEEDBACK_MAILTO, FREE_LIMIT, IAP_ENABLED } from '@/lib/constants';
import { formatCurrencyAmount } from '@/lib/formatCurrency';
import { formatMediumDate, intlLocaleTag } from '@/lib/formatDates';
import { isExpoGo } from '@/lib/iap';
import { requestNotificationPermission } from '@/lib/notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, languagePreference, setLanguagePreference } = useI18n();
  const {
    isPro,
    devProEnabled,
    setDevPro,
    renewals,
    restore,
    notificationScheduleFailed,
    retryNotificationSchedule,
  } = useSubRadar();
  const [notifHint, setNotifHint] = useState<string>('');
  const intlTag = intlLocaleTag(locale);

  const exportText = useMemo(() => {
    const lines = [t('export.header', { date: formatMediumDate(new Date(), locale) }), ''];
    const sorted = [...renewals].sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate));
    for (const r of sorted) {
      const price = formatCurrencyAmount(r.amount, r.currencyCode, intlTag);
      const d = parse(r.nextChargeDate, 'yyyy-MM-dd', new Date());
      const cycleLabel =
        r.billingCycle === 'weekly' || r.billingCycle === 'monthly' || r.billingCycle === 'yearly'
          ? t(`billingCycle.${r.billingCycle}`)
          : r.billingCycle;
      lines.push(
        `${r.name} — ${price} / ${cycleLabel} — ${t('renewals.next', { date: formatMediumDate(d, locale) })}`,
      );
      if (r.notes) lines.push(`${t('export.notesPrefix')} ${r.notes}`);
      if (r.cancelUrl) lines.push(`${t('export.cancelPrefix')} ${r.cancelUrl}`);
    }
    return lines.join('\n');
  }, [renewals, t, locale, intlTag]);

  const onExport = async () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    const file = new File(Paths.cache, 'subradar-renewals.txt');
    try {
      file.create({ overwrite: true });
    } catch {
      if (file.exists) file.delete();
      file.create();
    }
    file.write(exportText, { encoding: 'utf8' });
    const can = await Sharing.isAvailableAsync();
    if (!can) {
      Alert.alert(t('settings.shareUnavailableTitle'), t('settings.shareUnavailableBody'));
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: t('settings.shareDialogTitle'),
    });
  };

  const onNotif = async () => {
    const ok = await requestNotificationPermission();
    setNotifHint(ok ? t('settings.notifOn') : t('settings.notifOff'));
  };

  const onFeedback = async () => {
    const ok = await Linking.canOpenURL(FEEDBACK_MAILTO);
    if (ok) {
      await Linking.openURL(FEEDBACK_MAILTO);
      return;
    }
    Alert.alert(t('common.hint'), t('settings.feedbackUnavailable'));
  };

  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isExpoGo() && IAP_ENABLED ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{t('settings.expoBannerTitle')}</Text>
          <Text style={styles.bannerBody}>{t('settings.expoBannerBody')}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>{t('settings.sectionLanguage')}</Text>
      <View style={styles.card}>
        {(['system', 'zh', 'en'] as const).map((p) => (
          <Pressable
            key={p}
            style={styles.langRow}
            onPress={() => void setLanguagePreference(p)}
          >
            <Text style={styles.rowText}>
              {p === 'system' ? t('settings.langSystem') : p === 'zh' ? t('settings.langZh') : t('settings.langEn')}
            </Text>
            {languagePreference === p ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>{t('settings.sectionPlan')}</Text>
      <View style={styles.card}>
        {IAP_ENABLED ? (
          <>
            <Text style={styles.rowText}>{t('settings.planFree', { limit: FREE_LIMIT })}</Text>
            {Platform.OS === 'android' && !isPro ? (
              <Text style={styles.hint}>{t('settings.androidProNote')}</Text>
            ) : null}
            {isPro ? (
              <Text style={styles.proOn}>{t('settings.proActive')}</Text>
            ) : (
              <Pressable style={styles.button} onPress={() => router.push('/paywall')}>
                <Text style={styles.buttonText}>{t('settings.upgradePro')}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.rowText}>{t('settings.planAllIncluded')}</Text>
        )}
      </View>

      {__DEV__ && IAP_ENABLED ? (
        <>
          <Text style={styles.section}>{t('settings.sectionDev')}</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.rowText}>{t('settings.simulatePro')}</Text>
              <Switch value={devProEnabled} onValueChange={(v) => void setDevPro(v)} />
            </View>
          </View>
        </>
      ) : null}

      <Text style={styles.section}>{t('settings.sectionNotif')}</Text>
      <View style={styles.card}>
        {notificationScheduleFailed ? (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>{t('notifications.scheduleIncomplete')}</Text>
            <Pressable
              style={styles.warnBtn}
              onPress={() => void retryNotificationSchedule()}
            >
              <Text style={styles.warnBtnText}>{t('notifications.retrySchedule')}</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable style={styles.buttonSecondary} onPress={() => void onNotif()}>
          <Text style={styles.buttonSecondaryText}>{t('settings.enableReminders')}</Text>
        </Pressable>
        {notifHint ? <Text style={styles.hint}>{notifHint}</Text> : null}
      </View>

      <Text style={styles.section}>{t('settings.sectionEmailImport')}</Text>
      <View style={styles.card}>
        <Pressable style={styles.buttonSecondary} onPress={() => router.push('/email-import' as Href)}>
          <Text style={styles.buttonSecondaryText}>{t('settings.emailImportOpen')}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{t('settings.sectionExport')}</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>{t('settings.exportBackupHint')}</Text>
        <Pressable style={styles.buttonSecondary} onPress={() => void onExport()}>
          <Text style={styles.buttonSecondaryText}>{t('settings.exportBtn')}</Text>
        </Pressable>
        {IAP_ENABLED && !isPro ? <Text style={styles.hint}>{t('settings.exportNeedsPro')}</Text> : null}
      </View>

      <Text style={styles.section}>{t('settings.sectionAbout')}</Text>
      <View style={styles.card}>
        <Text style={styles.rowText}>{t('settings.version', { version: appVersion })}</Text>
        <Pressable style={styles.buttonSecondary} onPress={() => void onFeedback()}>
          <Text style={styles.buttonSecondaryText}>{t('settings.feedback')}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{t('settings.sectionPrivacy')}</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>{t('settings.privacyBody')}</Text>
        <Text style={[styles.muted, styles.privacyGap]}>{t('settings.privacyNoAnalytics')}</Text>
      </View>

      {IAP_ENABLED && Platform.OS === 'ios' ? (
        <Pressable style={styles.link} onPress={() => void restore()}>
          <Text style={styles.linkText}>{t('settings.restore')}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  bannerTitle: { color: '#C7D2FE', fontWeight: '700', marginBottom: 6 },
  bannerBody: { color: '#A5B4FC', fontSize: 13, lineHeight: 18 },
  section: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  check: { color: '#4ADE80', fontSize: 18, fontWeight: '700' },
  rowText: { color: '#E2E8F0', fontSize: 15, lineHeight: 20, flex: 1 },
  proOn: { color: '#4ADE80', fontWeight: '700' },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: '#E2E8F0', fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { color: '#64748B', fontSize: 13 },
  muted: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },
  privacyGap: { marginTop: 12 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#A5B4FC', fontSize: 15, fontWeight: '600' },
  warnBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderColor: '#A16207',
    gap: 10,
    marginBottom: 4,
  },
  warnText: { color: '#FEF3C7', fontSize: 14, lineHeight: 20 },
  warnBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#A16207',
  },
  warnBtnText: { color: '#FFFBEB', fontWeight: '700', fontSize: 14 },
});
