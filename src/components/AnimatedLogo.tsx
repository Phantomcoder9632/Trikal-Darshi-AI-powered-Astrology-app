import { useEffect } from 'react';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

/**
 * Website-hero emblem: a large ✦ glyph with a gold glow, wrapped in two
 * expanding pulse rings (`.lp-emblem-icon` + `.lp-emblem-ring` / `-2`),
 * gently floating like `.float-gentle`.
 */
export default function AnimatedLogo({ size = 120 }: { size?: number }) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const pulse = useSharedValue(1);
  const floatY = useSharedValue(0);

  useEffect(() => {
    // ring-expand 3s, second ring delayed 1s.
    // NOTE: no zero-duration timings here — a `withTiming(_, { duration: 0 })`
    // inside a repeated sequence crashes Reanimated 4's worklet chaining at
    // runtime (TypeError: undefined is not a function). The reset is instead
    // a quick 200ms fade-back, which reads as the ring re-spawning.
    const ringAnim = (sv: ReturnType<typeof useSharedValue<number>>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 200, easing: Easing.linear })
          ),
          -1,
          false
        )
      );
    };
    ringAnim(ring1, 0);
    ringAnim(ring2, 1000);

    // emblem-pulse 4s: subtle scale + brightness feel via opacity
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // float-gentle 5s
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [ring1, ring2, pulse, floatY]);

  const ringStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring1.value * 0.5 }],
    opacity: 0.35 * (1 - ring1.value),
  }));
  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring2.value * 0.5 }],
    opacity: 0.2 * (1 - ring2.value),
  }));
  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: pulse.value }],
  }));

  const ringSize = size * 1.35;

  return (
    <Animated.View style={[{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }, emblemStyle]}>
      {/* Expanding rings */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: 'rgba(201,149,42,0.55)',
          },
          ringStyle1,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            borderWidth: 1,
            borderColor: 'rgba(201,149,42,0.3)',
          },
          ringStyle2,
        ]}
      />
      {/* The glyph with glow (drop-shadow) */}
      <Animated.Text
        style={{
          fontSize: size * 0.52,
          color: colors.gold,
          textShadowColor: 'rgba(201,149,42,0.6)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 18,
        }}
      >
        ✦
      </Animated.Text>
    </Animated.View>
  );
}
