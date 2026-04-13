import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type InstantBrandAnimatedProps = {
  size?: number;
};

const STEM_COLOR = '#D97A5B';
const STEM_SHADOW = '#C96E52';
const COIN_COLOR = '#F5E9E2';
const COIN_HILITE = '#FFFFFF';
const COIN_SHADOW = 'rgba(0, 0, 0, 0.08)';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function InstantBrandAnimated({ size = 120 }: InstantBrandAnimatedProps) {
  const stemOpacity = useSharedValue(0);
  const stemScale = useSharedValue(0.96);
  const stemScaleY = useSharedValue(1);

  const coinOpacity = useSharedValue(0);
  const coinOffset = useSharedValue(0);
  const coinScaleX = useSharedValue(0.6);
  const coinScaleY = useSharedValue(0.6);

  const layout = useMemo(() => {
    const viewBoxSize = 140;
    const center = viewBoxSize / 2;
    const stemWidthTop = 10;
    const stemWidthBottom = 12;
    const stemHeight = 92;
    const stemTop = 36;
    const stemX = center - stemWidthBottom / 2;
    const stemBottom = stemTop + stemHeight;
    const coinRadius = 10.5;
    const coinCenterY = 24;
    const coinBaseOffset = stemTop + 8 - coinCenterY;
    return {
      viewBoxSize,
      center,
      stemWidthTop,
      stemWidthBottom,
      stemHeight,
      stemTop,
      stemX,
      stemBottom,
      coinRadius,
      coinCenterY,
      coinBaseOffset,
    };
  }, []);

  useEffect(() => {
    stemOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    stemScale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    stemScaleY.value = withSequence(
      withTiming(0.9, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withTiming(1.03, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 12, stiffness: 160 })
    );

    coinOpacity.value = withDelay(340, withTiming(1, { duration: 180 }));
    coinOffset.value = withDelay(
      340,
      withSequence(
        withTiming(-6, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 12, stiffness: 200 })
      )
    );
    coinScaleX.value = withDelay(
      340,
      withSequence(
        withTiming(1.25, { duration: 140, easing: Easing.out(Easing.cubic) }),
        withTiming(0.92, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 12, stiffness: 200 })
      )
    );
    coinScaleY.value = withDelay(
      340,
      withSequence(
        withTiming(0.82, { duration: 140, easing: Easing.out(Easing.cubic) }),
        withTiming(1.12, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 12, stiffness: 200 })
      )
    );
  }, [coinOffset, coinOpacity, coinScaleX, coinScaleY, stemOpacity, stemScale, stemScaleY]);

  const stemAnimatedProps = useAnimatedProps(() => ({
    opacity: stemOpacity.value,
    scaleX: stemScale.value,
    scaleY: stemScaleY.value,
  }));

  const coinAnimatedProps = useAnimatedProps(() => ({
    opacity: coinOpacity.value,
    scaleX: coinScaleX.value,
    scaleY: coinScaleY.value,
    y: layout.coinBaseOffset + coinOffset.value,
  }));

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${layout.viewBoxSize} ${layout.viewBoxSize}`}
      style={styles.svg}>
      <Defs>
        <LinearGradient id="stemGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={STEM_COLOR} />
          <Stop offset="1" stopColor={STEM_SHADOW} />
        </LinearGradient>
        <LinearGradient id="coinGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF6EF" />
          <Stop offset="1" stopColor={COIN_COLOR} />
        </LinearGradient>
      </Defs>
      <AnimatedG
        animatedProps={stemAnimatedProps}
        originX={layout.center}
        originY={layout.stemBottom}>
        <Path
          d={`M ${layout.center - layout.stemWidthTop / 2} ${layout.stemTop}
              Q ${layout.center} ${layout.stemTop - 4} ${layout.center + layout.stemWidthTop / 2} ${layout.stemTop}
              L ${layout.center + layout.stemWidthBottom / 2} ${layout.stemBottom}
              Q ${layout.center} ${layout.stemBottom + 4} ${layout.center - layout.stemWidthBottom / 2} ${layout.stemBottom}
              Z`}
          fill="url(#stemGradient)"
        />
      </AnimatedG>

      <AnimatedG animatedProps={coinAnimatedProps} originX={layout.center} originY={layout.coinCenterY}>
        <AnimatedCircle
          cx={layout.center}
          cy={layout.coinCenterY}
          r={layout.coinRadius}
          fill="url(#coinGradient)"
          stroke={COIN_SHADOW}
          strokeWidth={1}
        />
        <Circle
          cx={layout.center}
          cy={layout.coinCenterY}
          r={layout.coinRadius - 2.2}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth={1}
        />
        <Circle
          cx={layout.center - 3.6}
          cy={layout.coinCenterY - 3.6}
          r={3.4}
          fill={COIN_HILITE}
          opacity={0.45}
        />
      </AnimatedG>
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    alignSelf: 'center',
  },
});
