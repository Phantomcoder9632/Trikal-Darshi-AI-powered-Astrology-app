import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { Easing, useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SharedValue } from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { type as typeScale } from '../theme/typography';
import YantraBackground from '../components/YantraBackground';
import SriYantraVideo from '../components/SriYantraVideo';
import GradientWordmark from '../components/GradientWordmark';

const STATUS_LINES = [
  'Aligning planetary ephemerides…',
  'Reading the Lahiri ayanamsa…',
  'Charting twelve cosmic mansions…',
  'Invoking the Navagraha…',
  'The Trikal Darshi opens its eye…',
];

/** Number of constellation stars in the loading progress row. */
const STARS = 7;

export default function SplashScreen() {
  const [lineIdx, setLineIdx] = React.useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLineIdx((i) => (i + 1) % STATUS_LINES.length);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  // One shared value drives the whole convergence: grahas ignite, stars light.
  const trail = useSharedValue(0);
  useEffect(() => {
    trail.value = withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) });
  }, [trail]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <YantraBackground />
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* The brand film itself: the Sri Yantra building itself, full quality */}
        <View style={{ width: '100%', alignItems: 'center' }}>
          <SriYantraVideo height={360} loop={false} />
        </View>

        {/* Gold-gradient wordmark */}
        <View>
          <GradientWordmark scale={1.1} />
        </View>

        {/* Serif italic tagline */}
        <Text
          style={{
            fontFamily: typeScale.serif?.fontFamily,
            fontStyle: 'italic',
            fontSize: 15.5,
            color: colors.goldDark,
            letterSpacing: 0.8,
            marginTop: 12,
          }}
        >
          ॐ Your Cosmic Blueprint Awaits ॐ
        </Text>

        {/* Constellation progress — seven stars igniting in sequence */}
        <View style={{ marginTop: 26 }}>
          <ConstellationRow trail={trail} />
        </View>

        {/* Rotating status line */}
        <View style={{ height: 30, marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            key={lineIdx}
            style={[typeScale.caption, { color: colors.textMuted, fontStyle: 'italic', fontSize: 12 }]}
          >
            {STATUS_LINES[lineIdx]}
          </Text>
        </View>
      </SafeAreaView>

      <Text style={[typeScale.mono, { color: 'rgba(124,88,0,0.45)', textAlign: 'center', marginBottom: 22, fontSize: 10 }]}>
        ✦ VEDIC · LAL KITAB · NUMEROLOGY ✦
      </Text>
    </View>
  );
}

/** Seven ✦ stars that light up one by one as the convergence completes. */
function ConstellationRow({ trail }: { trail: SharedValue<number> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {Array.from({ length: STARS }, (_, i) => (
        <Star key={i} index={i} trail={trail} />
      ))}
    </View>
  );
}

function Star({ index, trail }: { index: number; trail: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const lit = interpolate(trail.value, [index / STARS, (index + 1) / STARS], [0.18, 1], 'clamp');
    const scale = interpolate(trail.value, [index / STARS, (index + 0.5) / STARS, (index + 1) / STARS], [1, 1.35, 1], 'clamp');
    return { opacity: lit, transform: [{ scale }] };
  });
  return (
    <Animated.Text style={[style, { color: colors.gold, fontSize: 15, lineHeight: 18 }]}>✦</Animated.Text>
  );
}
