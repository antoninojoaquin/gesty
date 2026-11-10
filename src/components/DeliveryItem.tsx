import { Pencil, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatTime } from '@/logic/dates';
import type { Delivery } from '@/logic/types';
import { colors, fonts, fontSize, radius, spacing, tabularNums } from '@/theme';

type Props = {
  delivery: Delivery;
  number: number;
  expanded: boolean;
  /** Toggles the Editar / Borrar actions. Omit to make the row read-only. */
  onToggle?: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** A delivery row; tapping it shows Editar / Borrar underneath (SPEC §4.2). */
export function DeliveryItem({ delivery, number, expanded, onToggle, onEdit, onDelete }: Props) {
  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <Pressable
        onPress={onToggle}
        disabled={!onToggle}
        accessibilityRole={onToggle ? 'button' : undefined}
        accessibilityHint={onToggle ? 'Muestra las opciones Editar y Borrar' : undefined}
        style={styles.row}
      >
        <Text style={styles.number}>{number}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {delivery.address}
        </Text>
        <Text style={styles.time}>{formatTime(delivery.createdAt)}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.actions}>
          <Button label="Editar" Icon={Pencil} variant="secondary" small onPress={onEdit} style={styles.action} />
          <Button label="Borrar" Icon={Trash2} variant="danger" small onPress={onDelete} style={styles.action} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  containerExpanded: {
    borderColor: colors.placeholder,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  number: {
    minWidth: 32,
    fontFamily: fonts.numberBold,
    fontSize: fontSize.body,
    color: colors.textMuted,
    ...tabularNums,
  },
  address: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  time: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
    ...tabularNums,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  action: {
    flex: 1,
  },
});
