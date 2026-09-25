/**
 * OfflineBanner — Trikal Darshi Mobile
 *
 * Displays a sticky banner at the top of the screen when the device goes
 * offline, and dismisses it automatically when connectivity is restored.
 * Improves UX score by giving users clear, real-time network feedback.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useNetworkStatus } from '../services/network';

export default function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isConnected) {
      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [isConnected, slideAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel="No internet connection"
    >
      <Text style={styles.icon}>📡</Text>
      <View>
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.sub}>Showing cached data · Check your network</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    backgroundColor: '#1A1035',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  icon: {
    fontSize: 20,
  },
  title: {
    color: '#C9A84C',
    fontWeight: '700',
    fontSize: 13,
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 1,
  },
});
