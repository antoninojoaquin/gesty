import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, icon, radius, sizes } from '@/theme';

type Props = {
  Icon: LucideIcon;
  /** Spoken by screen readers (the button has no visible text). */
  label: string;
  onPress: () => void;
  size?: number;
};

/** Square icon button (Historial, Ajustes, volver). 52×52 by default. */
export function IconButton({ Icon, label, onPress, size = sizes.iconButton }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}
    >
      <Icon color={colors.text} size={size >= sizes.iconButton ? icon.size : icon.sizeSmall} strokeWidth={icon.stroke} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
});
