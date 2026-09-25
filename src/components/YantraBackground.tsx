import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../theme/colors';

/**
 * Website `.lp-hero` background: parchment gradient, a faint static yantra
 * grid consolidated into a single SVG path for 60fps mobile performance.
 */
function YantraBackground() {
  const TILE = 80;

  // Combine 1,600 diamond grid tiles into a single SVG path string
  // Reduces 1,600 React Native SVG nodes down to 1 single node (99.9% node count reduction)
  const singleCombinedPath = useMemo(() => {
    let d = '';
    for (let row = 0; row < 30; row++) {
      for (let col = 0; col < 30; col++) {
        const cx = col * TILE + TILE / 2;
        const cy = row * TILE + TILE / 2;
        d += `M${cx} ${row * TILE}L${(col + 1) * TILE} ${cy}L${cx} ${(row + 1) * TILE}L${col * TILE} ${cy}Z `;
      }
    }
    return d;
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Parchment gradient base */}
      <LinearGradient
        colors={gradients.hero}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Yantra diamond grid — single path SVG for maximum rendering efficiency */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="200%" height="200%" style={{ position: 'absolute', left: '-50%', top: '-50%' }}>
          <Path
            d={singleCombinedPath}
            fill="none"
            stroke="#C9952A"
            strokeWidth={0.3}
            opacity={0.12}
          />
        </Svg>
      </View>

      {/* Warm ambient gold glows */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      {/* Golden shimmer sweep */}
      <View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 160,
            transform: [{ skewX: '-12deg' }, { translateX: 120 }],
            opacity: 0.35,
          },
        ]}
      >
        <LinearGradient
          colors={gradients.shimmerSweep}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );
}

export default React.memo(YantraBackground);

const styles = StyleSheet.create({
  glow1: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: '55%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(201,149,42,0.08)',
  },
  glow2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-15%',
    width: '50%',
    height: '55%',
    borderRadius: 999,
    backgroundColor: 'rgba(201,130,42,0.06)',
  },
});
