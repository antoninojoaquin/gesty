import { Alert } from 'react-native';

import { UserError } from '@/db/types';

/** Native confirmation dialog. Resolves true only when the confirm button is pressed. */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  { destructive = false }: { destructive?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Shows a failed action: the message of a UserError, or a generic one. */
export function showError(title: string, error: unknown): void {
  Alert.alert(title, error instanceof UserError ? error.message : 'Algo salió mal. Probá de nuevo.');
}
