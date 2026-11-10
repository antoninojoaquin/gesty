import type { LucideIcon } from '@/components/icons';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fonts, fontSize, icon, radius, sizes, spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger' | 'accentOutline';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  Icon?: LucideIcon;
  disabled?: boolean;
  /** Compact height for buttons inside rows (Editar / Borrar). */
  small?: boolean;
  style?: ViewStyle;
};

const VARIANTS: Record<ButtonVariant, { bg: string; border: string; text: string }> = {
  primary: { bg: colors.accent, border: colors.accent, text: colors.onAccent },
  outline: { bg: 'transparent', border: colors.border, text: colors.text },
  secondary: { bg: colors.surfaceAlt, border: colors.border, text: colors.text },
  danger: { bg: colors.dangerBg, border: colors.dangerBorder, text: colors.danger },
  accentOutline: { bg: 'transparent', border: colors.accent, text: colors.accentText },
};

const DISABLED = { bg: colors.disabled, border: colors.disabled, text: colors.placeholder };

export function Button({ label, onPress, variant = 'primary', Icon, disabled = false, small = false, style }: Props) {
  const v = disabled ? DISABLED : VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && styles.pressed,
        style,
      ]}
    >
      {Icon && <Icon color={v.text} size={small ? icon.sizeSmall : icon.size} strokeWidth={icon.stroke} />}
      <Text style={[styles.label, small && styles.labelSmall, { color: v.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.button,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  small: {
    minHeight: sizes.iconButton,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: fontSize.bodyLarge,
  },
  labelSmall: {
    fontSize: fontSize.body,
  },
});
