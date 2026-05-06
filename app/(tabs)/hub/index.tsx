import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PermissionStatus } from 'expo-modules-core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { parse } from 'date-fns';
import { AddRenewalChoiceModal } from '@/components/hub/AddRenewalChoiceModal';
import { SwipeToDeleteRow } from '@/components/hub/SwipeToDeleteRow';
import { useI18n } from '@/contexts/I18nContext';
import { useSubRadar } from '@/contexts/SubRadarContext';
import { formatCurrencyAmount, normalizeCurrencyCodeForIntl } from '@/lib/formatCurrency';
import { formatMediumDate, intlLocaleTag } from '@/lib/formatDates';
import { monthlyEquivalent } from '@/lib/renewalMath';
import { getNotificationPermissionStatus } from '@/lib/notifications';

function cycleLabel(t: (k: string) => string, bc: string): string {
  if (bc === 'weekly' || bc === 'monthly' || bc === 'yearly') return t(`billingCycle.${bc}`);
  return bc;
}

export default function HubScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t, locale } = useI18n();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('tabs.hub'),
      tabBarLabel: t('tabs.hub'),
    });
  }, [navigation, t, locale]);
  const { renewals, loading, canAddMore, notificationScheduleFailed, retryNotificationSchedule, deleteRenewal } =
    useSubRadar();
  const insets = useSafeAreaInsets();
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

  // Calculate monthly total
  const monthlyTotal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of renewals) {
      const code = normalizeCurrencyCodeForIntl(r.currencyCode);
      m[code] = (m[code] ?? 0) + monthlyEquivalent(r.amount, r.billingCycle);
    }
    return m;
  }, [renewals]);

  // Just show the first currency or total in USD equivalent if we wanted, 
  // but for now let's just list the currencies present.
  const totalDisplay = useMemo(() => {
    try {
      return Object.keys(monthlyTotal).length > 0
        ? Object.keys(monthlyTotal)
            .map((code) => formatCurrencyAmount(monthlyTotal[code]!, code, intlTag))
            .join(', ')
        : formatCurrencyAmount(0, 'USD', intlTag);
    } catch {
      return '—';
    }
  }, [monthlyTotal, intlTag]);

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
      <View
        style={[
          styles.summaryStickyWrap,
          { paddingTop: Math.max(insets.top, 8) },
        ]}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('summary.monthly').toUpperCase()}</Text>
          <Text style={styles.summaryValue}>{totalDisplay}</Text>
        </View>
      </View>

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Notification Warning */}
        {notificationScheduleFailed && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>{t('notifications.scheduleIncomplete')}</Text>
            <Pressable style={styles.warnBtn} onPress={() => void retryNotificationSchedule()}>
              <Text style={styles.warnBtnText}>{t('notifications.retrySchedule')}</Text>
            </Pressable>
          </View>
        )}
        {showNotifBanner && renewals.length > 0 && (
          <View style={styles.notifBanner}>
            <Text style={styles.notifBannerText}>{t('renewals.notifDisabledHint')}</Text>
            <Pressable style={styles.notifBannerBtn} onPress={() => void Linking.openSettings()}>
              <Text style={styles.notifBannerBtnText}>{t('renewals.notifOpenSettings')}</Text>
            </Pressable>
          </View>
        )}

        {/* Renewals List */}
        {renewals.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>{t('renewals.empty')}</Text>
          </View>
        ) : (
          renewals.map((item) => (
            <SwipeToDeleteRow
              key={item.id}
              containerStyle={styles.swipeOuter}
              cardStyle={styles.card}
              cardPressedStyle={styles.cardPressed}
              deleteLabel={t('form.delete')}
              onCardPress={() => router.push(`/subscription/${item.id}`)}
              onDeletePress={() => {
                Alert.alert(t('edit.deleteTitle'), item.name, [
                  { text: t('edit.cancel'), style: 'cancel' },
                  {
                    text: t('form.delete'),
                    style: 'destructive',
                    onPress: () => {
                      void deleteRenewal(item.id);
                    },
                  },
                ]);
              }}
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
            </SwipeToDeleteRow>
          ))
        )}
      </ScrollView>

      {/* FAB */}
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
  summaryStickyWrap: {
    backgroundColor: '#0B1220',
    paddingBottom: 12,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  listScroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingTop: 4 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#A5B4FC',
    fontSize: 36,
    fontWeight: '700',
  },
  emptyBlock: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: { color: '#94A3B8', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  swipeOuter: { marginHorizontal: 16, marginBottom: 8 },
  card: {
    marginBottom: 0,
    height: 96,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.85 },
  cardLeft: { flex: 1, minWidth: 0, paddingRight: 12, justifyContent: 'center' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0, maxWidth: '42%' },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600', lineHeight: 22 },
  cardSubLeft: { color: '#94A3B8', fontSize: 13, marginTop: 2, lineHeight: 18 },
  cardSubRight: { color: '#94A3B8', fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardPrice: { color: '#E2E8F0', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  fabDisabled: { opacity: 0.7 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  warnBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
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
    marginBottom: 12,
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
