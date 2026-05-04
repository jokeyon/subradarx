import { useRef, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const ACTION_WIDTH = 88;

type Props = {
  children: ReactNode;
  deleteLabel: string;
  onDeletePress: () => void;
  onCardPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
  cardPressedStyle?: StyleProp<ViewStyle>;
};

export function SwipeToDeleteRow({
  children,
  deleteLabel,
  onDeletePress,
  onCardPress,
  containerStyle,
  cardStyle,
  cardPressedStyle,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderGrant: () => {
        translateX.stopAnimation((val) => {
          offsetRef.current = typeof val === 'number' ? val : 0;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(0, Math.max(-ACTION_WIDTH, offsetRef.current + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: () => {
        translateX.stopAnimation((val) => {
          const snap = val < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0;
          offsetRef.current = snap;
          Animated.spring(translateX, {
            toValue: snap,
            useNativeDriver: false,
            friction: 9,
          }).start();
        });
      },
      onPanResponderTerminate: () => {
        translateX.stopAnimation((val) => {
          const snap = val < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0;
          offsetRef.current = snap;
          Animated.spring(translateX, {
            toValue: snap,
            useNativeDriver: false,
            friction: 9,
          }).start();
        });
      },
    }),
  ).current;

  const handleCardPress = () => {
    translateX.stopAnimation((v) => {
      if (v < -16) {
        offsetRef.current = 0;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false, friction: 9 }).start();
        return;
      }
      onCardPress();
    });
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.deleteUnderlay} pointerEvents="box-none">
        <Pressable style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]} onPress={onDeletePress}>
          <Text style={styles.deleteBtnText}>{deleteLabel}</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.foreground, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <Pressable style={({ pressed }) => [cardStyle, pressed && cardPressedStyle]} onPress={handleCardPress}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteUnderlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    width: ACTION_WIDTH,
    alignSelf: 'stretch',
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnPressed: { opacity: 0.92 },
  deleteBtnText: { color: '#FEF2F2', fontSize: 15, fontWeight: '700' },
  foreground: {
    backgroundColor: 'transparent',
  },
});
