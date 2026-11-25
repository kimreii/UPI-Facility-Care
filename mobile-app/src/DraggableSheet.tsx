import React, { useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

interface DraggableSheetProps {
  style?: StyleProp<ViewStyle>;
  onClose: () => void;
  children: React.ReactNode;
}

const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.9;

/**
 * Bottom sheet yang bisa ditarik naik-turun lewat garis handle di atasnya.
 * - Tarik ke bawah mengikuti jari/kursor, sheet ikut bergerak.
 * - Lepas setelah cukup jauh / cukup cepat -> sheet meluncur turun lalu tertutup.
 * - Lepas sebelum itu -> sheet memantul kembali ke posisi semula.
 * - Tarik ke atas sedikit memberi efek karet (rubber band) lalu kembali.
 */
export const DraggableSheet: React.FC<DraggableSheetProps> = ({
  style,
  onClose,
  children,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          // Ke bawah: ikuti 1:1. Ke atas: redam (rubber band) maksimal 24px.
          translateY.setValue(g.dy > 0 ? g.dy : Math.max(-24, g.dy * 0.25));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
            Animated.timing(translateY, {
              toValue: 700,
              duration: 180,
              useNativeDriver: Platform.OS !== 'web',
            }).start(() => {
              onCloseRef.current();
              setTimeout(() => translateY.setValue(0), 320);
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              bounciness: 6,
              useNativeDriver: Platform.OS !== 'web',
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        },
      }),
    [translateY]
  );

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]}>
      {/* Area tarik: lebar penuh supaya mudah dipegang, bukan hanya garis kecilnya */}
      <View
        {...panResponder.panHandlers}
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            height: 36,
            marginTop: -14,
            marginHorizontal: -20,
            marginBottom: 2,
          },
          Platform.OS === 'web'
            ? ({ cursor: 'grab', userSelect: 'none', touchAction: 'none' } as any)
            : null,
        ]}
      >
        <View
          style={{
            width: 44,
            height: 5,
            borderRadius: 3,
            backgroundColor: '#D1D5DB',
          }}
        />
      </View>
      {children}
    </Animated.View>
  );
};
