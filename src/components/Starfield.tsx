import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

/**
 * High-performance deterministic starfield backdrop.
 * Renders all stars in a single SVG layer to minimize view hierarchy overhead.
 */
function Starfield({
  count = 60,
  seed = 42,
  variant = 'light',
}: {
  count?: number;
  seed?: number;
  variant?: 'light' | 'dark';
}) {
  const stars = useMemo(() => {
    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      cx: `${(rand() * 100).toFixed(2)}%`,
      cy: `${(rand() * 100).toFixed(2)}%`,
      r: (0.5 + rand() * 1.1).toFixed(2),
      opacity: (0.2 + rand() * 0.7).toFixed(2),
    }));
  }, [count, seed]);

  const starColor = variant === 'light' ? colors.gold : colors.goldLight;
  const baseOpacity = variant === 'light' ? 0.4 : 1;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {stars.map((st) => (
          <Circle
            key={st.key}
            cx={st.cx}
            cy={st.cy}
            r={st.r}
            fill={starColor}
            opacity={Number(st.opacity) * baseOpacity}
          />
        ))}
      </Svg>
    </View>
  );
}

export default React.memo(Starfield);
