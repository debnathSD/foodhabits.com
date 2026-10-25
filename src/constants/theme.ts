import '@/global.css';

import { Platform } from 'react-native';

import type { Verdict } from '@/lib/verdict';

/**
 * foodhabits.com design tokens, shared in spirit with the website: deep
 * emerald and near-black with a chartreuse accent in dark mode, emerald on
 * warm paper in light mode.
 */
export const Colors = {
  light: {
    text: '#0C1A12',
    textSecondary: '#5B6A60',
    background: '#F3F1EA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7E3D7',
    border: '#E1DDD0',
    highlight: 'rgba(255,255,255,0.9)',
    tint: '#1E8A55',
    onTint: '#FFFFFF',
    accent: '#1E8A55',
    onAccent: '#FFFFFF',
    hero: '#0B2A1B',
    good: '#1A8A50',
    goodSoft: '#E1F2E7',
    warn: '#A86A00',
    warnSoft: '#F8EDD6',
    bad: '#C43D33',
    badSoft: '#FAE6E3',
  },
  dark: {
    text: '#EEF5EF',
    textSecondary: '#93A89B',
    background: '#07120D',
    backgroundElement: '#0F1F17',
    backgroundSelected: '#1A2E23',
    border: '#1E3228',
    highlight: 'rgba(255,255,255,0.06)',
    tint: '#57E39A',
    onTint: '#07120D',
    accent: '#D4F25C',
    onAccent: '#07120D',
    hero: '#0B2A1B',
    good: '#57E39A',
    goodSoft: '#12301F',
    warn: '#F2C14E',
    warnSoft: '#31270F',
    bad: '#FF6B5B',
    badSoft: '#381613',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = (typeof Colors)['light' | 'dark'];

/** Score colour: green for gut-friendly, amber for "in moderation", red for "go easy". */
export function verdictColors(verdict: Verdict, theme: Theme) {
  if (verdict === 'great' || verdict === 'good') return { color: theme.good, soft: theme.goodSoft };
  if (verdict === 'okay') return { color: theme.warn, soft: theme.warnSoft };
  return { color: theme.bad, soft: theme.badSoft };
}

/** Font families loaded in the root layout. */
export const Type = {
  serif: 'InstrumentSerif_400Regular',
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: { mono: 'ui-monospace' },
  default: { mono: 'monospace' },
  web: { mono: 'var(--font-mono)' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 12,
  medium: 20,
  large: 28,
} as const;

/** Two-layer shadow (ambient + key light) for raised cards. */
export const Elevation = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(0,0,0,0.18), 0 12px 32px rgba(0,0,0,0.22)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});

/** Room tab screens leave for the tab bar; on narrow web it's the floating dock (68px from the bottom). */
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 72 }) ?? 0;
export const MaxContentWidth = 720;
