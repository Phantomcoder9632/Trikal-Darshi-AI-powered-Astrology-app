import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Deterministic starfield backdrop.
 *
 * On the website the hero sits on parchment with faint warm-gold star
 * particles. We reproduce that with seeded, deterministic star positions and
 * a warm gold tint. `variant="dark"` switches to pale gold stars on indigo.
 */
export default function Starfield({
  count = 60,
  seed = 42,
  variant = 'light',
}: {
  count?: number;
  seed?: number;
  variant?: 'light' | 'dark';
}) {
  const stars = React.useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: rand() * 100,
      y: rand() * 100,
      size: 1 + rand() * 2.2,
      opacity: 0.2 + rand() * 0.7,
    }));
  }, [count, seed]);

  const starColor = variant === 'light' ? colors.gold : colors.goldLight;
  const baseOpacity = variant === 'light' ? 0.35 : 1;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((st) => (
        <View
          key={st.key}
          style={{
            position: 'absolute',
            left: `${st.x}%` as `${number}%`,
            top: `${st.y}%` as `${number}%`,
            width: st.size,
            height: st.size,
            borderRadius: st.size / 2,
            backgroundColor: starColor,
            opacity: st.opacity * baseOpacity,
          }}
        />
      ))}
    </View>
  );
}
