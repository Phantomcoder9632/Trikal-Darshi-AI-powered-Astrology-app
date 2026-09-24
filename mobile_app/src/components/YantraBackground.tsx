import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../theme/colors';

/**
 * Website `.lp-hero` background: parchment gradient, a faint rotating yantra
 * (diamond) grid, three blurred gold glows, and the golden shimmer sweep.
 */
export default function YantraBackground() {
  // NOTE: The original design rotated the whole yantra grid continuously and
  // swept a shimmer bar across the screen. On low-end Android that meant
  // re-rasterizing ~1,600 SVG paths every frame — it pinned the RenderThread
  // and left the app on a blank parchment screen. Both are static now; the
  // parchment look is preserved without the per-frame repaint cost.
  const TILE = 80;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Parchment gradient base */}
      <LinearGradient
        colors={gradients.hero}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Yantra diamond grid (SVG data-URI pattern on the web) — static */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="240%" height="240%" style={{ position: 'absolute', left: '-70%', top: '-70%' }}>
          {Array.from({ length: 40 }, (_, row) =>
            Array.from({ length: 40 }, (_, col) => (
              <Path
                key={`${row}-${col}`}
                d={`M${col * TILE + TILE / 2} ${row * TILE} L${(col + 1) * TILE} ${row * TILE + TILE / 2} L${col * TILE + TILE / 2} ${(row + 1) * TILE} L${col * TILE} ${row * TILE + TILE / 2} Z`}
                fill="none"
                stroke="#C9952A"
                strokeWidth={0.3}
                opacity={0.1}
              />
            ))
          )}
        </Svg>
      </View>

      {/* Three blurred gold glows (lp-glow-1/2/3) */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />
      <View style={styles.glow3} />

      {/* Golden shimmer sweep — static accent (was an infinite Reanimated
          loop that re-rendered every frame) */}
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

const styles = StyleSheet.create({
  glow1: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: '55%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(201,149,42,0.12)',
    filter: 'blur(60px)',
  },
  glow2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-15%',
    width: '50%',
    height: '55%',
    borderRadius: 999,
    backgroundColor: 'rgba(201,130,42,0.08)',
    filter: 'blur(60px)',
  },
  glow3: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    width: '40%',
    height: '40%',
    borderRadius: 999,
    backgroundColor: 'rgba(201,149,42,0.07)',
    filter: 'blur(60px)',
  },
});
