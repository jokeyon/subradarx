import { PermissionStatus } from 'expo-modules-core';
import { useFocusEffect, useRouter } from 'expo-router';
import { parse } from 'date-fns';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useI18n } from '../../contexts/I18nContext';
import { useSubRadar } from '../../contexts/SubRadarContext';
import { formatMediumDate, intlLocaleTag } from '../../lib/formatDates';
import { getNotificationPermissionStatus } from '../../lib/notifications';

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

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const s = await getNotificationPermissionStatus();
        setNotifStatus(s);
      })();
    }, []),
  );

  const showNotifBanner = Platform.OS !== 'web' && notifStatus !== PermissionStatus.GRANTED;

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
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/subscription/${item.id}`)}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{cycleLabel(t, item.billingCycle)}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardPrice}>
                {item.amount.toLocaleString(intlTag, {
                  style: 'currency',
                  currency: item.currencyCode || 'USD',
                })}
              </Text>
              <Text style={styles.cardSub}>
                {t('renewals.next', {
                  date: formatMediumDate(parse(item.nextChargeDate, 'yyyy-MM-dd', new Date()), locale),
                })}
              </Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable
        style={[styles.fab, !canAddMore && styles.fabDisabled]}
        onPress={() => {
          if (!canAddMore) {
            router.push('/paywall');
            return;
          }
          router.push('/subscription/new');
        }}
      >
        <Text style={styles.fabText}>{t('renewals.add')}</Text>
      </Pressable>
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
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPressed: { opacity: 0.85 },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600' },
  cardSub: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
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
