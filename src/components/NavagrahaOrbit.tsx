import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';

/**
 * NAVAGRAHA CONVERGENCE — a unique cosmic loading animation.
 *
 * Nine planetary grahas orbit a glowing golden bindu (the "seeing eye" of
 * Trikal Darshi) at their own classical speeds — Moon fastest, Saturn
 * slowest, Rahu/Ketu retrograde — between two counter-rotating dashed
 * rings evoking the twelve zodiac mansions.
 */

type Graha = {
  sigil: string;
  color: string;
  glow: string;
  /** Orbit period in seconds — loosely following classical speed order. */
  period: number;
  retrograde?: boolean;
};

const GRAHAS: Graha[] = [
  { sigil: 'Mo', color: '#8FA6D9', glow: 'rgba(143,166,217,0.35)', period: 14 }, // Moon — fastest
  { sigil: 'Me', color: '#3FA66A', glow: 'rgba(63,166,106,0.35)', period: 17 }, // Mercury
  { sigil: 'Ve', color: '#E3B7A0', glow: 'rgba(227,183,160,0.35)', period: 20 }, // Venus
  { sigil: 'Su', color: '#E0912F', glow: 'rgba(224,145,47,0.4)', period: 24 }, // Sun
  { sigil: 'Ma', color: '#C0392B', glow: 'rgba(192,57,43,0.35)', period: 28 }, // Mars
  { sigil: 'Ju', color: '#D9A93B', glow: 'rgba(217,169,59,0.4)', period: 36 }, // Jupiter
  { sigil: 'Sa', color: '#5B6B8C', glow: 'rgba(91,107,140,0.35)', period: 46 }, // Saturn — slowest
  { sigil: 'Ra', color: '#8A6FA8', glow: 'rgba(138,111,168,0.35)', period: 40, retrograde: true }, // Rahu
  { sigil: 'Ke', color: '#9C7A5B', glow: 'rgba(156,122,91,0.35)', period: 40, retrograde: true }, // Ketu
];

/** Three orbit shells so the grahas never stack on one line. */
const SHELLS = [0.56, 0.74, 0.92];
const SHELL_OF_PLANET = [0, 0, 0, 1, 1, 1, 2, 2, 2];

function OrbitRing({ size, reverse, duration, dashed }: { size: number; reverse?: boolean; duration: number; dashed?: boolean }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(reverse ? -360 : 360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [rot, reverse, duration]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const r = size / 2 - 2;
  const c = { x: size / 2, y: size / 2 };
  return (
    <Animated.View style={[{ position: 'absolute' }, ringStyle]}>
      <Svg width={size} height={size}>
        {dashed ? (
          <Circle
            cx={c.x}
            cy={c.y}
            r={r}
            stroke="rgba(201,149,42,0.34)"
            strokeWidth={1}
            strokeDasharray="2 7"
            fill="none"
          />
        ) : (
          <Circle cx={c.x} cy={c.y} r={r} stroke="rgba(201,149,42,0.22)" strokeWidth={0.8} fill="none" />
        )}
      </Svg>
    </Animated.View>
  );
}

function Graha({
  graha,
  index,
  containerSize,
  trailProgress,
}: {
  graha: Graha;
  index: number;
  containerSize: number;
  trailProgress?: SharedValue<number>;
}) {
  const angle = useSharedValue(0);
  useEffect(() => {
    const dir = graha.retrograde ? -1 : 1;
    angle.value = withRepeat(
      withTiming(dir * 360, { duration: graha.period * 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [angle, graha.period, graha.retrograde]);

  const radius = (SHELLS[SHELL_OF_PLANET[index]] * containerSize) / 2;
  const chip = Math.max(22, Math.round(containerSize * 0.088));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${angle.value}deg` },
      { translateY: -radius },
      { rotate: `${-angle.value}deg` },
    ],
  }));

  // Each graha gently breathes; grahas also brighten as the convergence
  // progresses (used by the splash's constellation phase).
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 1800 + index * 260, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [breathe, index]);

  const glowStyle = useAnimatedStyle(() => {
    const lift = trailProgress ? interpolate(trailProgress.value, [index / 9, (index + 1) / 9], [0.55, 1], 'clamp') : 1;
    return {
      opacity: (0.82 + 0.18 * breathe.value) * lift,
      transform: [{ scale: 1 + 0.07 * breathe.value }],
    };
  });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', ...centerIn(containerSize) }}>
      <Animated.View style={[orbitStyle, glowStyle]}>
        <View
          style={{
            width: chip,
            height: chip,
            borderRadius: chip / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,253,246,0.92)',
            borderWidth: 1.4,
            borderColor: graha.color,
            shadowColor: graha.color,
            shadowOpacity: 0.55,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 0 },
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamilies.serif,
              fontSize: chip * 0.42,
              fontWeight: '700',
              color: graha.color,
              letterSpacing: 0,
            }}
          >
            {graha.sigil}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

function centerIn(containerSize: number) {
  return { left: containerSize / 2 - 40, top: containerSize / 2 - 20, width: 80, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const };
}

export default function NavagrahaOrbit({
  size = 280,
  trailProgress,
}: {
  size?: number;
  /** Optional 0→1 shared value; grahas ignite one by one as it advances. */
  trailProgress?: SharedValue<number>;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Warm aura behind the bindu */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: size * 0.23,
          backgroundColor: 'rgba(232,190,102,0.16)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: size * 0.14,
          backgroundColor: 'rgba(224,168,60,0.22)',
        }}
      />

      <OrbitRing size={size * 0.995} duration={90} dashed />
      <OrbitRing size={size * 0.72} duration={65} />
      <OrbitRing size={size * 0.46} duration={48} dashed />

      {/* The bindu — the still center every graha revolves around */}
      <Bindu size={size} />

      {GRAHAS.map((g, i) => (
        <Graha key={g.sigil} graha={g} index={i} containerSize={size} trailProgress={trailProgress} />
      ))}
    </View>
  );
}

/** Pulsing golden bindu with a fine ✦ sparkle. */
function Bindu({ size }: { size: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const core = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.14 * pulse.value }],
    opacity: 0.85 + 0.15 * pulse.value,
  }));
  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.5 * pulse.value }],
    opacity: 0.35 - 0.25 * pulse.value,
  }));

  const d = Math.max(16, size * 0.075);
  return (
    <View pointerEvents="none" style={{ position: 'absolute' }}>
      <Animated.View
        style={[
          halo,
          {
            width: d * 2.4,
            height: d * 2.4,
            borderRadius: d * 1.2,
            backgroundColor: 'rgba(224,168,60,0.5)',
          },
        ]}
      />
      <Animated.View
        style={[
          core,
          {
            position: 'absolute',
            width: d,
            height: d,
            borderRadius: d / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.gold,
            shadowColor: colors.goldDark,
            shadowOpacity: 0.9,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          },
        ]}
      >
        <Text style={{ color: '#FFFDF6', fontSize: d * 0.55, lineHeight: d * 0.62, fontWeight: '700' }}>✦</Text>
      </Animated.View>
    </View>
  );
}
