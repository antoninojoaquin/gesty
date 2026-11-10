import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { normalizeAddress } from '@/logic/shifts';
import { colors, fonts, fontSize, radius, sizes, spacing, typography } from '@/theme';

type Props = {
  /** Address being edited; null hides the modal. */
  initial: string | null;
  onCancel: () => void;
  onSave: (address: string) => void;
};

/** Small dialog to fix a delivery address (Android has no Alert.prompt). */
export function EditAddressModal({ initial, onCancel, onSave }: Props) {
  const [value, setValue] = useState(initial ?? '');

  useEffect(() => {
    if (initial !== null) setValue(initial);
  }, [initial]);

  const address = normalizeAddress(value);
  const save = () => address && onSave(address);

  return (
    <Modal visible={initial !== null} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancelar" />
        <View style={styles.dialog}>
          <Text style={typography.title}>Editar dirección</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={save}
            autoFocus
            selectTextOnFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            placeholder="Dirección"
            placeholderTextColor={colors.placeholder}
            cursorColor={colors.accent}
            selectionColor={colors.accentSoft}
            style={styles.input}
          />
          <View style={styles.buttons}>
            <Button label="Cancelar" variant="outline" onPress={onCancel} style={styles.button} />
            <Button label="Guardar" onPress={save} disabled={!address} style={styles.button} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screen,
    backgroundColor: colors.overlay,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  input: {
    minHeight: sizes.button,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
