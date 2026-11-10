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

/** Shows a failed action: the message of a UserError, or a generic one. */
export function showError(title: string, error: unknown): Promise<void> {
  return showDialog({
    title,
    message: error instanceof UserError ? error.message : 'Algo salió mal. Probá de nuevo.',
    Icon: AlertCircle,
    tone: 'danger',
    actions: [{ label: 'Entendido', value: undefined, variant: 'outline' }],
    dismissValue: undefined,
  });
}
