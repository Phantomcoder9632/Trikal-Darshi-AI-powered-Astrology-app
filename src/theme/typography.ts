import { Platform } from 'react-native';

/**
 * The web app pairs Fraunces (serif, headlines) with Inter (body).
 * React Native cannot load Google Fonts without extra native modules, so we
 * map to the closest system families: a high-contrast serif for headlines and
 * the platform default sans for body text — same visual hierarchy, zero
 * custom-font risk.
 */
export const fontFamilies = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })!,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
};

export const type = {
  serif: { fontFamily: fontFamilies.serif },
  wordmark: { fontFamily: fontFamilies.serif, fontSize: 22, fontWeight: '700' as const, letterSpacing: 1.2 },
  headline: { fontFamily: fontFamilies.serif, fontSize: 20, fontWeight: '700' as const },
  headlineSm: { fontFamily: fontFamilies.serif, fontSize: 17, fontWeight: '700' as const },
  title: { fontFamily: fontFamilies.sans, fontSize: 15, fontWeight: '600' as const },
  body: { fontFamily: fontFamilies.sans, fontSize: 15, lineHeight: 24 },
  bodySm: { fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.sans, fontSize: 11.5, lineHeight: 17 },
  label: { fontFamily: fontFamilies.sans, fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.4 },
  mono: { fontFamily: fontFamilies.mono, fontSize: 11 },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
