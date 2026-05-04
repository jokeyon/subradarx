import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useI18n } from '@/contexts/I18nContext';
import { useSubRadar } from '@/contexts/SubRadarContext';
import { IAP_ENABLED, SUBSCRIPTION_SKUS } from '@/lib/constants';
import { isExpoGo } from '@/lib/iap';

export default function PaywallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { products, purchaseSku, restore, reloadProducts, isPro } = useSubRadar();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    navigation.setOptions({
      title: IAP_ENABLED ? t('nav.paywall') : t('paywall.iapDisabledTitle'),
    });
  }, [navigation, t]);

  useEffect(() => {
    if (IAP_ENABLED && Platform.OS === 'ios') void reloadProducts();
  }, [reloadProducts]);

  useEffect(() => {
    if (IAP_ENABLED && isPro) closeModal();
  }, [isPro, closeModal]);

  if (!IAP_ENABLED) {
    return (
      <View style={[styles.screen, styles.iapOffContent]}>
        <Text style={styles.title}>{t('paywall.iapDisabledTitle')}</Text>
        <Text style={styles.sub}>{t('paywall.iapDisabledBody')}</Text>
        <Pressable style={styles.close} onPress={closeModal}>
          <Text style={styles.closeText}>{t('paywall.close')}</Text>
        </Pressable>
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={[styles.screen, styles.iapOffContent]}>
        <Text style={styles.title}>{t('paywall.androidOnlyTitle')}</Text>
        <Text style={styles.sub}>{t('paywall.androidOnlyBody')}</Text>
        <Pressable style={styles.close} onPress={closeModal}>
          <Text style={styles.closeText}>{t('paywall.close')}</Text>
        </Pressable>
      </View>
    );
  }

  const buy = async (sku: string) => {
    setErr(null);
    setBusy(sku);
    try {
      await purchaseSku(sku);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('paywall.purchaseFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('paywall.title')}</Text>
      <Text style={styles.sub}>{t('paywall.subtitle')}</Text>
      <View style={styles.bullets}>
        <Text style={styles.bullet}>{t('paywall.bullet1')}</Text>
        <Text style={styles.bullet}>{t('paywall.bullet2')}</Text>
        <Text style={styles.bullet}>{t('paywall.bullet3')}</Text>
      </View>

      {isExpoGo() ? <Text style={styles.warn}>{t('paywall.expoWarn')}</Text> : null}

      {products.length === 0 && !isExpoGo() ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#A5B4FC" />
          <Text style={styles.loadingText}>
            {t('paywall.loadingPlans', {
              ids: SUBSCRIPTION_SKUS.join(', '),
            })}
          </Text>
        </View>
      ) : null}

      {products.map((p) => (
        <Pressable
          key={p.productId}
          disabled={busy !== null}
          style={[styles.plan, busy === p.productId && styles.planBusy]}
          onPress={() => void buy(p.productId)}
        >
          <View>
            <Text style={styles.planTitle}>{p.title ?? p.productId}</Text>
            {p.description ? <Text style={styles.planDesc}>{p.description}</Text> : null}
          </View>
          <Text style={styles.price}>{p.localizedPrice ?? '—'}</Text>
        </Pressable>
      ))}

      {products.length > 0 ? <Text style={styles.pricingNote}>{t('paywall.pricingNote')}</Text> : null}

      <Pressable style={styles.restore} onPress={() => void restore()}>
        <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
      </Pressable>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Pressable style={styles.close} onPress={closeModal}>
        <Text style={styles.closeText}>{t('paywall.close')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  iapOffContent: { padding: 20, paddingBottom: 40, justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#F8FAFC', fontSize: 26, fontWeight: '800' },
  sub: { color: '#94A3B8', marginTop: 8, lineHeight: 20 },
  bullets: { marginTop: 16, gap: 6 },
  bullet: { color: '#CBD5E1' },
  warn: { marginTop: 16, color: '#FBBF24', lineHeight: 20 },
  loadingBox: { marginTop: 20, gap: 10 },
  loadingText: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  plan: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#312E81',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planBusy: { opacity: 0.6 },
  planTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700' },
  planDesc: { color: '#94A3B8', fontSize: 12, marginTop: 4, maxWidth: 220 },
  price: { color: '#EEF2FF', fontSize: 17, fontWeight: '800' },
  pricingNote: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 14 },
  restore: { marginTop: 18, alignItems: 'center' },
  restoreText: { color: '#A5B4FC', fontWeight: '700' },
  err: { color: '#F87171', marginTop: 12, textAlign: 'center' },
  close: { marginTop: 20, alignItems: 'center' },
  closeText: { color: '#64748B', fontWeight: '600' },
});
