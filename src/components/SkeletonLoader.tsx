/**
 * SkeletonLoader — Trikal Darshi Mobile
 *
 * Animated shimmer placeholders shown while data is loading.
 * Significantly improves perceived performance and UX score by
 * replacing blank screens / spinners with content-shaped skeletons.
 *
 * Usage:
 *   <SkeletonLoader variant="card" />
 *   <SkeletonLoader variant="list" rows={5} />
 *   <SkeletonLoader variant="profile" />
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  variant?: 'card' | 'list' | 'profile' | 'text';
  rows?: number;
  style?: ViewStyle;
}

function ShimmerBox({ width, height, borderRadius = 10, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.14)'],
  });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: bg }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export default function SkeletonLoader({ variant = 'card', rows = 4, style }: SkeletonProps) {
  if (variant === 'profile') {
    return (
      <View style={[styles.container, style]}>
        {/* Avatar */}
        <ShimmerBox width={80} height={80} borderRadius={40} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <ShimmerBox width="60%" height={20} borderRadius={8} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <ShimmerBox width="40%" height={14} borderRadius={6} style={{ alignSelf: 'center', marginBottom: 24 }} />
        {/* Stats row */}
        <View style={styles.row}>
          {[1, 2, 3].map((i) => (
            <ShimmerBox key={i} width="30%" height={56} borderRadius={12} />
          ))}
        </View>
        {/* Rows */}
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBox key={i} width="100%" height={52} borderRadius={12} style={{ marginBottom: 10 }} />
        ))}
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={[styles.container, style]}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={styles.listItem}>
            <ShimmerBox width={44} height={44} borderRadius={22} />
            <View style={styles.listText}>
              <ShimmerBox width="70%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
              <ShimmerBox width="45%" height={11} borderRadius={5} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (variant === 'text') {
    return (
      <View style={[styles.container, style]}>
        {Array.from({ length: rows }).map((_, i) => (
          <ShimmerBox
            key={i}
            width={i === rows - 1 ? '65%' : '100%'}
            height={12}
            borderRadius={5}
            style={{ marginBottom: 8 }}
          />
        ))}
      </View>
    );
  }

  // Default: card
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <ShimmerBox width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ShimmerBox width="60%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
          <ShimmerBox width="35%" height={10} borderRadius={5} />
        </View>
      </View>
      <ShimmerBox width="100%" height={110} borderRadius={12} style={{ marginBottom: 12 }} />
      <ShimmerBox width="80%" height={12} borderRadius={5} style={{ marginBottom: 8 }} />
      <ShimmerBox width="60%" height={12} borderRadius={5} style={{ marginBottom: 8 }} />
      <ShimmerBox width="70%" height={12} borderRadius={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  listText: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
});
