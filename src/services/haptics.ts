import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Central haptic vocabulary — one place so the whole app "speaks" the same
 * tactile language. No-ops on web/simulators that lack the module.
 */

const enabled = Platform.OS === 'android' || Platform.OS === 'ios';

/** Light tick — tab switches, chips, small toggles. */
export function tapLight() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium thud — primary button presses, opening a reading. */
export function tapMedium() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Soft double-tap — a chapter finished streaming / data arrived. */
export function successTick() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning buzz — errors, offline fallback. */
export function warningBuzz() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Distinct selection spin — picking vargas, language, planets. */
export function selectionTick() {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}
