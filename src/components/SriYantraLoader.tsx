import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

/**
 * SRI YANTRA CONVERGENCE — loader that builds the Sri Yantra the same way the
 * reference video does: the central bindu appears, the interlocking
 * Shiva/Shakti triangle pairs draw in, the two lotus-petal rings bloom
 * outward, and the outer bhupura squares lock in — then the bindu gently
 * pulses.
 *
 * Implementation notes (learned from the white-screen bug):
 * - No Reanimated layout animations and no worklets: only RN Animated with
 *   useNativeDriver for opacity/scale, driven by stage state. Safe in release.
 * - No MaskedView / gradient masks.
 * - SVG paths are static once mounted; nothing re-rasterizes per frame, so
 *   the render thread stays idle after the build completes (only two tiny
 *   native-driver loops on the bindu halo and a barely-visible breathing of
 *   the whole yantra).
 */

const GOLD = colors.gold; // #C9952A
const GOLD_DEEP = colors.goldDeep; // #A67820
const GOLD_BRIGHT = colors.goldBright; // #F5D080

const rad = (d: number) => (d * Math.PI) / 180;

/** A lotus petal as a closed quadratic path around the yantra center. */
function petalPath(angle: number, r0: number, r1: number, spread: number): string {
  const ax = 100 + r0 * Math.cos(rad(angle - spread));
  const ay = 100 - r0 * Math.sin(rad(angle - spread));
  const bx = 100 + r0 * Math.cos(rad(angle + spread));
  const by = 100 - r0 * Math.sin(rad(angle + spread));
  const tx = 100 + r1 * Math.cos(rad(angle));
  const ty = 100 - r1 * Math.sin(rad(angle));
  const rc = r0 + (r1 - r0) * 0.72;
  const c1x = 100 + rc * Math.cos(rad(angle - spread * 0.55));
  const c1y = 100 - rc * Math.sin(rad(angle - spread * 0.55));
  const c2x = 100 + rc * Math.cos(rad(angle + spread * 0.55));
  const c2y = 100 - rc * Math.sin(rad(angle + spread * 0.55));
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} Q ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} Z`;
}

// Interlocking triangle pairs, alternating down (Shakti) / up (Shiva).
const TRIANGLE_PAIRS: Array<Array<string>> = [
  [
    'M30,58 L170,58 L100,158 Z', // outermost down
    'M30,142 L170,142 L100,42 Z', // outermost up
  ],
  [
    'M45,70 L155,70 L100,148 Z',
    'M46,134 L154,134 L100,54 Z',
  ],
  [
    'M60,84 L140,84 L100,140 Z',
    'M62,126 L138,126 L100,66 Z',
  ],
  [
    'M72,96 L128,96 L100,134 Z',
    'M76,118 L124,118 L100,78 Z',
  ],
];

const OUTER_PETALS = Array.from({ length: 8 }, (_, i) => petalPath(i * 45 + 22.5, 72, 90, 13));
const INNER_PETALS = Array.from({ length: 16 }, (_, i) => petalPath(i * 22.5, 36, 54, 8));

const BHUPURA = [96, 89, 82]; // half-sizes of the three square frames

/** Springy pop-in wrapper: opacity 0→1, scale 0.4→1 when `on` flips true. */
function Pop({
  on,
  delay = 0,
  children,
}: {
  on: boolean;
  delay?: number;
  children: React.ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => {
      Animated.spring(v, { toValue: 1, speed: 16, bounciness: 7, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [on, delay, v]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: v,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function SriYantraLoader({
  size = 280,
  caption,
}: {
  size?: number;
  caption?: string;
}) {
  // Build stages: 0 bindu, 1 bindu glow, 2-5 triangle pairs,
  // 6 outer petals, 7 inner petals, 8 bhupura.
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const SCHED: Array<[number, number]> = [
      [0, 0],
      [320, 1],
      [560, 2],
      [800, 3],
      [1040, 4],
      [1280, 5],
      [1700, 6],
      [2050, 7],
      [2500, 8],
    ];
    const timers = SCHED.map(([t, s]) => setTimeout(() => setStage(s), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Bindu pulse halo (native-driver loop, cheap).
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Whole-yantra breathing, barely perceptible, keeps it feeling alive.
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const breathScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ width: '100%', height: '100%', transform: [{ scale: breathScale }] }}>
        {/* Bindu glow halo (behind everything, pulses) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 0.22,
            height: size * 0.22,
            marginLeft: -size * 0.11,
            marginTop: -size * 0.11,
            borderRadius: size,
            backgroundColor: GOLD,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.32] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }],
          }}
        />

        {/* Bindu */}
        <Pop on={stage >= 0}>
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Circle cx={100} cy={100} r={11} fill={GOLD} opacity={stage >= 1 ? 0.3 : 0.12} />
            <Circle cx={100} cy={100} r={4.2} fill={GOLD_BRIGHT} stroke={GOLD_DEEP} strokeWidth={0.8} />
          </Svg>
        </Pop>

        {/* Interlocking triangle pairs */}
        {TRIANGLE_PAIRS.map((pair, i) => (
          <Pop key={`pair${i}`} on={stage >= 2 + i}>
            <Svg width="100%" height="100%" viewBox="0 0 200 200">
              <Path d={pair[0]} fill="none" stroke={GOLD_DEEP} strokeWidth={1.6} strokeLinejoin="round" />
              <Path d={pair[1]} fill="none" stroke={GOLD} strokeWidth={1.6} strokeLinejoin="round" />
            </Svg>
          </Pop>
        ))}

        {/* Lotus rings */}
        <Pop on={stage >= 6}>
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            {OUTER_PETALS.map((d, i) => (
              <Path key={i} d={d} fill="none" stroke={GOLD} strokeWidth={1.1} opacity={0.8} />
            ))}
          </Svg>
        </Pop>
        <Pop on={stage >= 7}>
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            {INNER_PETALS.map((d, i) => (
              <Path key={i} d={d} fill="none" stroke={GOLD_DEEP} strokeWidth={1} opacity={0.75} />
            ))}
          </Svg>
        </Pop>

        {/* Bhupura — three nested square frames */}
        {BHUPURA.map((half, i) => (
          <Pop key={`bh${i}`} on={stage >= 8} delay={i * 160}>
            <Svg width="100%" height="100%" viewBox="0 0 200 200">
              <Rect
                x={100 - half}
                y={100 - half}
                width={half * 2}
                height={half * 2}
                fill="none"
                stroke={i === BHUPURA.length - 1 ? GOLD_BRIGHT : GOLD}
                strokeWidth={i === BHUPURA.length - 1 ? 1.8 : 1.2}
                opacity={0.9}
              />
            </Svg>
          </Pop>
        ))}
      </Animated.View>

      {caption ? (
        <Animated.Text
          style={{
            position: 'absolute',
            bottom: -26,
            color: colors.textMuted,
            fontStyle: 'italic',
            fontSize: 12,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
          }}
        >
          {caption}
        </Animated.Text>
      ) : null}
    </View>
  );
}
