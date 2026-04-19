import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { useI18n } from '../../../contexts/I18nContext';
import { RenewalsTab } from '../../../components/hub/RenewalsTab';
import { SummaryTab } from '../../../components/hub/SummaryTab';

export default function HubScreen() {
  const { t, locale } = useI18n();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  const goTo = useCallback((index: number) => {
    setPage(index);
    pagerRef.current?.setPage(index);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.tabBar, { paddingTop: Math.max(insets.top, 4) }]}>
        <Pressable
          style={styles.tabHit}
          onPress={() => goTo(0)}
          accessibilityRole="tab"
          accessibilityState={{ selected: page === 0 }}
        >
          <Text style={[styles.tabLabel, page === 0 && styles.tabLabelActive]}>{t('tabs.renewals')}</Text>
          {page === 0 ? <View style={styles.indicator} /> : <View style={styles.indicatorPlaceholder} />}
        </Pressable>
        <Pressable
          style={styles.tabHit}
          onPress={() => goTo(1)}
          accessibilityRole="tab"
          accessibilityState={{ selected: page === 1 }}
        >
          <Text style={[styles.tabLabel, page === 1 && styles.tabLabelActive]}>{t('tabs.summary')}</Text>
          {page === 1 ? <View style={styles.indicator} /> : <View style={styles.indicatorPlaceholder} />}
        </Pressable>
      </View>

      <PagerView
        key={locale}
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        <View key="renewals" style={[styles.page, { width }]}>
          <RenewalsTab />
        </View>
        <View key="summary" style={[styles.page, { width }]}>
          <SummaryTab />
        </View>
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  tabHit: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { color: '#64748B', fontSize: 15, fontWeight: '600' },
  tabLabelActive: { color: '#A5B4FC' },
  indicator: {
    marginTop: 8,
    height: 3,
    width: '40%',
    maxWidth: 72,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  indicatorPlaceholder: { marginTop: 8, height: 3 },
  pager: { flex: 1 },
  page: { flex: 1 },
});
