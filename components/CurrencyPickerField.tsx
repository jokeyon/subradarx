import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactElement } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrencyPickerCodes } from '@/lib/currencyOptions';
import { normalizeCurrencyCodeForIntl } from '@/lib/formatCurrency';

type Props = {
  value: string;
  onChange: (code: string) => void;
  localeTag: string;
  title: string;
  dismissLabel: string;
  triggerStyle?: StyleProp<ViewStyle>;
};

function rowLabel(code: string, localeTag: string): string {
  try {
    const dn = new Intl.DisplayNames([localeTag], { type: 'currency' });
    const name = dn.of(code);
    return name && name !== code ? `${code} · ${name}` : code;
  } catch {
    return code;
  }
}

export function CurrencyPickerField({
  value,
  onChange,
  localeTag,
  title,
  dismissLabel,
  triggerStyle,
}: Props): ReactElement {
  const [open, setOpen] = useState(false);
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listMaxH = Math.min(windowH * 0.52, 420);
  const codes = useMemo(() => getCurrencyPickerCodes(value), [value]);
  const display = normalizeCurrencyCodeForIntl(value);

  return (
    <>
      <Pressable
        style={[styles.triggerBase, triggerStyle]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityHint={title}
      >
        <Text style={styles.triggerText}>{display}</Text>
        <Ionicons name="chevron-down" size={20} color="#94A3B8" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel={dismissLabel}
            accessibilityRole="button"
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Text style={styles.sheetTitle}>{title}</Text>
            <FlatList
              data={codes}
              keyExtractor={(item) => item}
              style={[styles.list, { maxHeight: listMaxH }]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = normalizeCurrencyCodeForIntl(value) === item;
                return (
                  <Pressable
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[styles.rowText, selected && styles.rowTextSelected]}
                      numberOfLines={2}
                    >
                      {rowLabel(item, localeTag)}
                    </Text>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color="#A5B4FC" /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerText: {
    color: '#F8FAFC',
    fontSize: 16,
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: '#1E293B',
    zIndex: 1,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
  },
  rowSelected: { backgroundColor: '#1E1B4B' },
  rowText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 16,
  },
  rowTextSelected: { color: '#F8FAFC', fontWeight: '600' },
});
