/**
 * Gesty design tokens (docs/SPEC.md §5).
 * Components must take colors, fonts and sizes from here — never hardcode them.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#0E0E10',
  surface: '#19191C',
  surfaceAlt: '#232327',
  border: '#34343A',
  text: '#F5F5F7',
  textMuted: '#ABABB2',
  placeholder: '#85858C',
  /** Red: primary button backgrounds, "in progress" dot, focus border. */
  accent: '#E0322A',
  /** Text on top of `accent` is always white. */
  onAccent: '#FFFFFF',
  /** Light red: totals, links and highlighted text on dark backgrounds. */
  accentText: '#FF6B5E',
  /** Background of red chips/badges (with `accentText`). */
  accentSoft: '#3A1513',
  /** Disabled button background (with `placeholder` text). */
  disabled: '#2A2A2E',
  /** "Borrar" button: text, background and border. */
  danger: '#FF9A85',
  dangerBg: '#2A1914',
  dangerBorder: '#5A2E25',
  /** Background of the app icon and lockup. */
  logoBg: '#16161A',
} as const;

/** Opacity of the subtle diagonal red band (§4.1). */
export const bandOpacity = 0.16;

/**
 * Font families as registered in `fontAssets`. On Android a custom font does not
 * switch weight via `fontWeight`, so each weight is its own family.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** Space Grotesk: big numbers (shift counter, money totals). */
  numberSemibold: 'SpaceGrotesk_600SemiBold',
  numberBold: 'SpaceGrotesk_700Bold',
} as const;

/** Font files bundled with the app (they work offline). Loaded in the root layout. */
export const fontAssets = {
  [fonts.regular]: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  [fonts.medium]: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  [fonts.semibold]: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  [fonts.bold]: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  [fonts.numberSemibold]: require('@expo-google-fonts/space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf'),
  [fonts.numberBold]: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
} as const;

/** Font sizes in dp. Body text never goes below 16. */
export const fontSize = {
  caption: 16,
  body: 18,
  bodyLarge: 20,
  title: 24,
  heading: 28,
  /** Card numbers (month stats, history totals). */
  number: 32,
  /** Shift total and home "last shift" figures. */
  numberLarge: 44,
  /** Shift counter and big summary totals. */
  numberHuge: 56,
} as const;

/** Tabular figures so counters and totals don't jump while updating. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
  /** Horizontal screen padding. */
  screen: 20,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const sizes = {
  /** Minimum height for buttons and inputs. */
  button: 60,
  /** Square icon buttons (Historial, Ajustes, back). */
  iconButton: 52,
  /** Small icon buttons on the active shift screen. */
  iconButtonSmall: 44,
  /** "Iniciar turno" circle diameter. */
  startButton: 260,
  /** Height of the logo lockup on the home screen. */
  logoHeight: 40,
} as const;

export const theme = { colors, fonts, fontSize, spacing, radius, sizes, bandOpacity, tabularNums };
export type Theme = typeof theme;
