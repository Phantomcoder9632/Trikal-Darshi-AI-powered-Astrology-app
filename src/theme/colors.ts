export const colors = {
  // Background & Surfaces (Vedic Manuscript Parchment) — website-exact
  paper: '#FBF6EA',
  heroGradient: ['#FFFDF7', '#FDF8EF', '#FAF5E3'] as const,
  surface: '#FFFDF6',
  surfaceLow: '#FAF5E8',
  surfaceContainer: '#EFE7D2',

  // Primary (Temple Midnight Indigo)
  indigo: '#022454',
  indigoContainer: '#1F3A6B',
  indigoDeep: '#12244A',
  blueWash: '#EBF1FA',

  // Gold ramp — website hero / wordmark exact values
  gold: '#C9952A',
  goldBright: '#F5D080',
  goldDeep: '#A67820',
  goldDark: '#9E6800',
  goldInk: '#5C3D00',
  ochre: '#7C5800',
  goldLight: '#F0DFAF',
  sand: '#E8D5A7',
  sandDeep: '#D3C4B0',

  // Warm manuscript text colors (website body palette)
  ink: '#1A1510',
  inkOnLight: '#3C2E18',
  textMuted: 'rgba(60,46,24,0.62)',
  textFaint: 'rgba(79,69,54,0.50)',
  textGhost: 'rgba(79,69,54,0.35)',

  // Status
  error: '#BA1A1A',
  errorContainer: 'rgba(186,26,26,0.08)',
  success: '#1E6E3E',
  successContainer: '#E7F5EC',
} as const;

export const gradients = {
  hero: colors.heroGradient,
  wordmark: ['#5C3D00', '#9E6800', '#C9952A'] as const,
  wordmarkLine2: ['#A67820', '#C9952A', '#8A6318'] as const,
  ctaGold: ['#C9952A', '#A67820'] as const,
  shimmerSweep: [
    'rgba(201,149,42,0.00)',
    'rgba(201,149,42,0.10)',
    'rgba(245,208,128,0.16)',
    'rgba(201,149,42,0.10)',
    'rgba(201,149,42,0.00)',
  ] as const,
  cardTopLine: [
    'rgba(201,149,42,0.00)',
    '#C9952A',
    '#F5D080',
    '#C9952A',
    'rgba(201,149,42,0.00)',
  ] as const,
} as const;
