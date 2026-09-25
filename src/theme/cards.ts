import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { radii } from './typography';

/**
 * Shared "manuscript card" look: warm parchment surface, golden sand border,
 * and the signature golden corner accents from the web design system.
 */
export const card = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(217,166,60,0.45)',
  },
  soft: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(232,213,167,0.7)',
  },
  chip: {
    backgroundColor: 'rgba(250,245,232,0.85)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,213,167,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
