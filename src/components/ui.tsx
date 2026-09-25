import React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '../theme/colors';
import { type as typeScale, radii, spacing, fontFamilies } from '../theme/typography';
import { card } from '../theme/cards';
import { tapMedium } from '../services/haptics';

/** The signature golden corner accents used on premium cards in the web app. */
export function CornerAccents({ size = 10, inset = 8, opacity = 0.8 }: { size?: number; inset?: number; opacity?: number }) {
  const base: ViewStyle = { position: 'absolute', width: size, height: size, borderColor: colors.gold, opacity };
  return (
    <>
      <View style={[base, { top: inset, left: inset, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[base, { top: inset, right: inset, borderTopWidth: 2, borderRightWidth: 2 }]} />
      <View style={[base, { bottom: inset, left: inset, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[base, { bottom: inset, right: inset, borderBottomWidth: 2, borderRightWidth: 2 }]} />
    </>
  );
}

export function Card({
  children,
  style,
  withAccents = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  withAccents?: boolean;
}) {
  return (
    <View style={[card.base, style]}>
      {withAccents && <CornerAccents />}
      {children}
    </View>
  );
}

export function Label({ children, color = colors.ochre, style }: { children: React.ReactNode; color?: string; style?: object }) {
  return <Text style={[typeScale.label, { color }, style]}>{children}</Text>;
}

export function Value({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[typeScale.title, { color: colors.indigo }, style]}>{children}</Text>;
}

/** Small info chip: label / value / sub — the CosmicSummary grid unit. */
export function InfoChip({ label, value, sub, alert, good }: { label: string; value: React.ReactNode; sub?: string; alert?: boolean; good?: boolean }) {
  const valueColor = alert ? colors.error : good ? colors.success : colors.indigo;
  return (
    <View style={card.chip}>
      <Text style={[typeScale.label, { color: colors.textFaint, letterSpacing: 0.8, marginBottom: 2 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[typeScale.title, { color: valueColor, fontSize: 13.5 }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={[typeScale.caption, { color: colors.ochre, fontSize: 10 }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => {
        tapMedium();
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: pressed || disabled ? colors.indigoDeep : colors.indigoContainer,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderColor: 'rgba(217,166,60,0.55)',
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.goldLight} />
      ) : (
        <Text style={{ color: colors.goldLight, fontWeight: '700', fontSize: 13.5, letterSpacing: 0.5 }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? '#F4EEDA' : colors.surfaceLow,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: 'rgba(217,166,60,0.45)',
          paddingVertical: 12,
          paddingHorizontal: 18,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 13.5 }}>{title}</Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(232,213,167,0.9)' }} />;
}

/** Section heading with the ✦ gold star glyph. */
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: spacing.sm, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexShrink: 1 }}>
        <Text style={{ color: colors.gold, fontSize: 13 }}>✦</Text>
        <Text style={[typeScale.label, { color: colors.ochre, fontSize: 10.5, flexShrink: 1 }]} numberOfLines={1}>
          {children}
        </Text>
      </View>
      {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}

/** Website `.lp-wordmark` serif — for the ✦-prefixed brand rows. */
export function Wordmark({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <Text
      style={{
        fontFamily: fontFamilies.serif,
        fontSize: size,
        fontWeight: '700' as const,
        letterSpacing: 1.2,
        color: colors.indigo,
      }}
    >
      {children}
    </Text>
  );
}
