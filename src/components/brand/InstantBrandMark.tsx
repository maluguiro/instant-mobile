import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type InstantBrandMarkProps = {
  size?: number;
};

const BRAND_COLOR = '#D97A5B';
const COIN_COLOR = '#F5E9E2';

export function InstantBrandMark({ size = 96 }: InstantBrandMarkProps) {
  const iOpacity = useSharedValue(0);
  const iScale = useSharedValue(0.95);
  const coinScale = useSharedValue(0);
  const coinTranslate = useSharedValue(-20);
  const coinRotate = useSharedValue(-8);

  useEffect(() => {
    iOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    iScale.value = withSequence(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0.92, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 12, stiffness: 180 })
    );
    coinScale.value = withDelay(260, withSpring(1, { damping: 12, stiffness: 200 }));
    coinTranslate.value = withDelay(260, withSpring(0, { damping: 12, stiffness: 180 }));
    coinRotate.value = withDelay(260, withTiming(0, { duration: 220 }));
  }, [coinRotate, coinScale, coinTranslate, iOpacity, iScale]);

  const sizes = useMemo(() => {
    const stemWidth = Math.round(size * 0.18);
    const stemHeight = Math.round(size * 0.62);
    const coinSize = Math.round(size * 0.28);
    const coinTop = Math.round(size * 0.06);
    return { stemWidth, stemHeight, coinSize, coinTop };
  }, [size]);

  const iStyle = useAnimatedStyle(() => ({
    opacity: iOpacity.value,
    transform: [{ scale: iScale.value }],
  }));

  const coinStyle = useAnimatedStyle(() => ({
    opacity: coinScale.value,
    transform: [
      { translateY: coinTranslate.value },
      { scale: coinScale.value },
      { rotate: `${coinRotate.value}deg` },
    ],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.stem,
          {
            width: sizes.stemWidth,
            height: sizes.stemHeight,
            borderRadius: Math.round(sizes.stemWidth / 2),
            backgroundColor: BRAND_COLOR,
          },
          iStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.coin,
          {
            width: sizes.coinSize,
            height: sizes.coinSize,
            borderRadius: Math.round(sizes.coinSize / 2),
            top: sizes.coinTop,
            marginLeft: -Math.round(sizes.coinSize / 2),
            backgroundColor: COIN_COLOR,
          },
          coinStyle,
        ]}>
        <View
          style={[
            styles.highlight,
            {
              width: Math.round(sizes.coinSize * 0.35),
              height: Math.round(sizes.coinSize * 0.35),
              borderRadius: Math.round(sizes.coinSize * 0.18),
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stem: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  coin: {
    position: 'absolute',
    left: '50%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  highlight: {
    position: 'absolute',
    top: 4,
    left: 5,
    backgroundColor: '#ffffff',
    opacity: 0.45,
  },
});
