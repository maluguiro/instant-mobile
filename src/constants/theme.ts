/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E1A17',
    background: '#F8F4F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFE7DE',
    textSecondary: '#6F6760',
    brand: '#2C7A6A',
    brandSoft: '#D8F0EA',
    accent: '#C9895B',
    accentSoft: '#F6E7DA',
    success: '#2E8B57',
    warning: '#D99152',
    border: '#E5DDD3',
    card: '#FFFFFF',
    cardAlt: '#FAF2EA',
  },
  dark: {
    text: '#F5F1ED',
    background: '#14110F',
    backgroundElement: '#1F1B18',
    backgroundSelected: '#2A2420',
    textSecondary: '#B6AFA7',
    brand: '#7ED1BF',
    brandSoft: '#23423B',
    accent: '#E5B38C',
    accentSoft: '#3B2A1F',
    success: '#6FD29F',
    warning: '#E8B07B',
    border: '#2D2722',
    card: '#1C1815',
    cardAlt: '#231D19',
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
