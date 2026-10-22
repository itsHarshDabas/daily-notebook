import '@/global.css';

import { Platform } from 'react-native';

import type { TrackerKey } from '@daily-notebook/shared';

export const Palettes = {
  light: {
    background: '#F6F6F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEFEA',
    border: '#E4E4DE',
    text: '#16171A',
    textSecondary: '#5F6168',
    textTertiary: '#9A9CA3',
    accent: '#4F46E5',
    accentSoft: '#4F46E51A',
    onAccent: '#FFFFFF',
    danger: '#D93F3F',
    success: '#1F9D55',
    warning: '#E07B16',
    gridEmpty: '#E9E9E3',
    shadow: '#1A1A1A',
  },
  dark: {
    background: '#0E0F12',
    surface: '#17191D',
    surfaceAlt: '#1F2227',
    border: '#2A2D33',
    text: '#F2F2F0',
    textSecondary: '#A3A6AD',
    textTertiary: '#6E727A',
    accent: '#8B85FF',
    accentSoft: '#8B85FF26',
    onAccent: '#0E0F12',
    danger: '#F06A6A',
    success: '#3FCB7E',
    warning: '#F59E4B',
    gridEmpty: '#1E2126',
    shadow: '#000000',
  },
} as const;

export type Palette = { [K in keyof (typeof Palettes)['light']]: string };
export type ThemeColor = keyof Palette;

/** Each tracker's colour; readable on both light and dark surfaces. */
export const TrackerColors: Record<TrackerKey, string> = {
  mood: '#F2A93B',
  calories: '#F2763A',
  monthlyGoal: '#D9468F',
  water: '#2BA8E0',
  sleep: '#6D5EF5',
  exercise: '#22B573',
  expenses: '#13A39A',
  period: '#E5484D',
};

/** Grid shades for levels 1-4 as the tracker colour at rising opacity. */
export function levelColor(base: string, level: number, empty: string): string {
  if (level <= 0) return empty;
  const alpha = ['', '47', '80', 'BF', 'FF'][Math.min(4, level)];
  return `${base}${alpha}`;
}

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, monospace' }),
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const MaxContentWidth = 720;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Solid blend of two #RRGGBB colours; t = 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
