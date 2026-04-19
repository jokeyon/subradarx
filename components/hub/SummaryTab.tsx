import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../contexts/I18nContext';
import { useSubRadar } from '../../contexts/SubRadarContext';
import { intlLocaleTag } from '../../lib/formatDates';
import { monthlyEquivalent } from '../../lib/renewalMath';

export function SummaryTab() {
  const { t, locale } = useI18n();
  const { renewals } = useSubRadar();
  const intlTag = intlLocaleTag(locale);

  const byCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of renewals) {
      const code = r.currencyCode || 'USD';
      m[code] = (m[code] ?? 0) + monthlyEquivalent(r.amount, r.billingCycle);
    }
    return m;
  }, [renewals]);

  const codes = Object.keys(byCurrency).sort();

  if (renewals.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{t('summary.empty')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t('summary.monthly')}</Text>
      {codes.map((code) => (
        <View key={code} style={styles.row}>
          <Text style={styles.label}>{code}</Text>
          <Text style={styles.value}>
            {(byCurrency[code] ?? 0).toLocaleString(intlTag, {
              style: 'currency',
              currency: code,
            })}
          </Text>
        </View>
      ))}
      <Text style={[styles.sectionTitle, styles.spaced]}>{t('summary.yearly')}</Text>
      {codes.map((code) => (
        <View key={`y-${code}`} style={styles.row}>
          <Text style={styles.muted}>{code}</Text>
          <Text style={styles.mutedValue}>
            {((byCurrency[code] ?? 0) * 12).toLocaleString(intlTag, {
              style: 'currency',
              currency: code,
            })}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, backgroundColor: '#0B1220', padding: 24, justifyContent: 'center' },
  empty: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  spaced: { marginTop: 28 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  label: { color: '#E2E8F0', fontSize: 16 },
  value: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
  muted: { color: '#94A3B8', fontSize: 15 },
  mutedValue: { color: '#94A3B8', fontSize: 15 },
});
