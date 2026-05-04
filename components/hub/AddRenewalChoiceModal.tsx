import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onManual: () => void;
  onSmartImport: () => void;
  title: string;
  manualLabel: string;
  smartImportLabel: string;
  /** Screen reader label for the dimmed backdrop (tap outside to close). */
  dismissAccessibilityLabel: string;
};

export function AddRenewalChoiceModal({
  visible,
  onClose,
  onManual,
  onSmartImport,
  title,
  manualLabel,
  smartImportLabel,
  dismissAccessibilityLabel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel}
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => {
              onClose();
              onManual();
            }}
          >
            <Text style={styles.optionText}>{manualLabel}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => {
              onClose();
              onSmartImport();
            }}
          >
            <Text style={styles.optionText}>{smartImportLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  sheet: {
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 8,
    zIndex: 1,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
  },
  optionPressed: { opacity: 0.85 },
  optionText: { color: '#E2E8F0', fontSize: 16, fontWeight: '600' },
});
