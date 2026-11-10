import { AlertCircle, type LucideIcon } from 'lucide-react-native';

import { showDialog, type DialogTone } from '@/components/DialogHost';
import { UserError } from '@/db/types';

export { showDialog };

type ConfirmOptions = {
  /** Red confirm button and icon, for actions that delete data. */
  destructive?: boolean;
  Icon?: LucideIcon;
  /** Big figure shown above the message. */
  highlight?: string;
  tone?: DialogTone;
};

/** Themed confirmation dialog. Resolves true only when the confirm button is pressed. */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  { destructive = false, Icon, highlight, tone }: ConfirmOptions = {},
): Promise<boolean> {
  return showDialog({
    title,
    message,
    highlight,
    Icon,
    tone: tone ?? (destructive ? 'danger' : 'accent'),
    actions: [
      { label: confirmLabel, value: true, variant: destructive ? 'danger' : 'primary' },
      { label: 'Cancelar', value: false, variant: 'outline' },
    ],
    dismissValue: false,
  });
}

/**
 * Shows a failed action: the message of a UserError, or a generic one.
 * In development the technical error is also shown and logged, to diagnose it.
 */
export function showError(title: string, error: unknown): Promise<void> {
  let message = error instanceof UserError ? error.message : 'Algo salió mal. Probá de nuevo.';
  if (__DEV__ && !(error instanceof UserError)) {
    console.error(`[${title}]`, error);
    message += `\n\n[dev] ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
  }
  return showDialog({
    title,
    message,
    Icon: AlertCircle,
    tone: 'danger',
    actions: [{ label: 'Entendido', value: undefined, variant: 'outline' }],
    dismissValue: undefined,
  });
}
