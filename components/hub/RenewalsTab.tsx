import { Ionicons } from '@expo/vector-icons';
import { PermissionStatus } from 'expo-modules-core';
import { useFocusEffect, useRouter } from 'expo-router';
import { parse } from 'date-fns';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AddRenewalChoiceModal } from '@/components/hub/AddRenewalChoiceModal';
import { useI18n } from '@/contexts/I18nContext';
import { useSubRadar } from '@/contexts/SubRadarContext';
import { formatCurrencyAmount } from '@/lib/formatCurrency';
import { formatMediumDate, intlLocaleTag } from '@/lib/formatDates';
import { getNotificationPermissionStatus } from '@/lib/notifications';
import { looksLikeHttpUrl } from '@/lib/urlUtils';

function cycleLabel(
  t: (k: string) => string,
  bc: string,
): string {
  if (bc === 'weekly' || bc === 'monthly' || bc === 'yearly') return t(`billingCycle.${bc}`);
  return bc;
}

export function RenewalsTab() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const {
    renewals,
    loading,
    canAddMore,
    notificationScheduleFailed,
    retryNotificationSchedule,
  } = useSubRadar();
  const intlTag = intlLocaleTag(locale);
  const [notifStatus, setNotifStatus] = useState<PermissionStatus>(PermissionStatus.GRANTED);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const s = await getNotificationPermissionStatus();
        setNotifStatus(s);
      })();
    }, []),
  );

  const showNotifBanner = Platform.OS !== 'web' && notifStatus !== PermissionStatus.GRANTED;

  const openManageLink = useCallback(
    async (url: string) => {
      const u = url.trim();
      if (!looksLikeHttpUrl(u)) return;
      const ok = await Linking.canOpenURL(u);
      if (!ok) {
        Alert.alert(t('common.hint'), t('form.errorCancelUrl'));
        return;
      }
      await Linking.openURL(u);
    },
    [t],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#A5B4FC" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={renewals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={renewals.length === 0 ? styles.emptyContainer : undefined}
        ListHeaderComponent={
          <>
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
            {showNotifBanner && renewals.length > 0 ? (
              <View style={styles.notifBanner}>
                <Text style={styles.notifBannerText}>{t('renewals.notifDisabledHint')}</Text>
                <Pressable style={styles.notifBannerBtn} onPress={() => void Linking.openSettings()}>
                  <Text style={styles.notifBannerBtnText}>{t('renewals.notifOpenSettings')}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            {showNotifBanner ? (
              <View style={styles.notifBanner}>
                <Text style={styles.notifBannerText}>{t('renewals.notifDisabledHint')}</Text>
                <Pressable style={styles.notifBannerBtn} onPress={() => void Linking.openSettings()}>
                  <Text style={styles.notifBannerBtnText}>{t('renewals.notifOpenSettings')}</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.emptyText}>{t('renewals.empty')}</Text>
            <Text style={styles.swipeHint}>{t('renewals.swipeHint')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const manage = item.cancelUrl?.trim() ?? '';
          const showOpen = looksLikeHttpUrl(manage);
          return (
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
                onPress={() => router.push(`/subscription/${item.id}`)}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                  </Text>
                  <Text style={styles.cardSubLeft} numberOfLines={1} ellipsizeMode="tail">
                    {cycleLabel(t, item.billingCycle)}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardPrice} numberOfLines={1} ellipsizeMode="tail">
                    {formatCurrencyAmount(item.amount, item.currencyCode, intlTag)}
                  </Text>
                  <Text style={styles.cardSubRight} numberOfLines={1} ellipsizeMode="tail">
                    {t('renewals.next', {
                      date: formatMediumDate(parse(item.nextChargeDate, 'yyyy-MM-dd', new Date()), locale),
                    })}
                  </Text>
                </View>
              </Pressable>
              {showOpen ? (
                <Pressable
                  style={({ pressed }) => [styles.cardOpenAside, pressed && styles.cardOpenAsidePressed]}
                  onPress={() => {
                    void openManageLink(manage);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('form.openCancelLink')}
                  hitSlop={8}
                >
                  <Ionicons name="open-outline" size={22} color="#A5B4FC" />
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
      <Pressable
        style={[styles.fab, !canAddMore && styles.fabDisabled]}
        onPress={() => {
          if (!canAddMore) {
            router.push('/paywall');
            return;
          }
          setAddMenuOpen(true);
        }}
      >
        <Text style={styles.fabText}>{t('renewals.add')}</Text>
      </Pressable>

      <AddRenewalChoiceModal
        visible={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        onManual={() => router.push('/subscription/new')}
        onSmartImport={() => router.push('/email-import')}
        title={t('renewals.addChooseTitle')}
        manualLabel={t('renewals.addManual')}
        smartImportLabel={t('renewals.addSmartImport')}
        dismissAccessibilityLabel={t('common.dismiss')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  centered: { flex: 1, backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyBlock: { paddingHorizontal: 8, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  swipeHint: { color: '#64748B', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 96,
    paddingLeft: 16,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
    paddingVertical: 12,
    paddingRight: 8,
  },
  cardPressed: { opacity: 0.85 },
  cardLeft: { flex: 1, minWidth: 0, paddingRight: 12, justifyContent: 'center' },
  cardOpenAside: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingRight: 10,
    paddingLeft: 4,
    flexShrink: 0,
  },
  cardOpenAsidePressed: { opacity: 0.7 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0, maxWidth: '42%' },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600', lineHeight: 22 },
  cardSubLeft: { color: '#94A3B8', fontSize: 13, marginTop: 2, lineHeight: 18 },
  cardSubRight: { color: '#94A3B8', fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardPrice: { color: '#E2E8F0', fontSize: 16, fontWeight: '600' },
  fab: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  fabDisabled: { opacity: 0.7 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  warnBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderColor: '#A16207',
    gap: 10,
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
  notifBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#4338CA',
    gap: 10,
  },
  notifBannerText: { color: '#C7D2FE', fontSize: 14, lineHeight: 20 },
  notifBannerBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  notifBannerBtnText: { color: '#A5B4FC', fontWeight: '700', fontSize: 14 },
});
