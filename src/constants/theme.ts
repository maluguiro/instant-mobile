/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2C1F1A',
    background: '#F6EEE4',
    backgroundElement: '#FFF8F2',
    backgroundSelected: '#F0E2D4',
    textSecondary: '#7A6A60',
    brand: '#B46A55',
    onBrand: '#FFF8F2',
    brandSoft: '#EBD9C4',
    accent: '#A45D44',
    accentSoft: '#D2986C',
    success: '#B46A55',
    warning: '#D2986C',
    border: '#E6D4C2',
    card: '#FFF8F2',
    cardAlt: '#F3E5D7',
    duoAccent: '#C69FD5',
    duoSoft: '#FDFDC9',
  },
  dark: {
    text: '#F7EEE6',
    background: '#1A1412',
    backgroundElement: '#241B17',
    backgroundSelected: '#2F241F',
    textSecondary: '#B8A89D',
    brand: '#D59A7F',
    onBrand: '#1A1412',
    brandSoft: '#3A2A24',
    accent: '#C2876B',
    accentSoft: '#4A3228',
    success: '#D59A7F',
    warning: '#E0A57E',
    border: '#3A2C26',
    card: '#211915',
    cardAlt: '#2A1F1B',
    duoAccent: '#C69FD5',
    duoSoft: '#FDFDC9',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
