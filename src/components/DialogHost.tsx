import type { LucideIcon } from '@/components/icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, type ButtonVariant } from '@/components/Button';
import { colors, fonts, fontSize, radius, spacing, tabularNums, typography } from '@/theme';

export type DialogTone = 'accent' | 'danger' | 'neutral';

export type DialogAction<T> = {
  label: string;
  value: T;
  variant?: ButtonVariant;
};

export type DialogOptions<T> = {
  title: string;
  message?: string;
  /** Big figure shown above the message (e.g. the shift total). */
  highlight?: string;
  Icon?: LucideIcon;
  tone?: DialogTone;
  /** Top to bottom. Put the main action first and the cancel action last. */
  actions: DialogAction<T>[];
  /** Returned when the dialog is dismissed (back button, tap outside). */
  dismissValue: T;
};

type Request = DialogOptions<unknown> & { resolve: (value: unknown) => void };

const TONES: Record<DialogTone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentSoft, fg: colors.accentText },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.surfaceAlt, fg: colors.text },
};

let enqueue: ((request: Request) => void) | null = null;

/** Shows a themed dialog and resolves with the value of the chosen action. */
export function showDialog<T>(options: DialogOptions<T>): Promise<T> {
  return new Promise<T>((resolve) => {
    if (!enqueue) {
      // The host is not mounted (should not happen): behave as dismissed.
      resolve(options.dismissValue);
      return;
    }
    enqueue({ ...(options as DialogOptions<unknown>), resolve: resolve as (value: unknown) => void });
  });
}

/** Renders dialogs requested with `showDialog`, one at a time. Mount once at the app root. */
export function DialogHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const current = queue[0];

  useEffect(() => {
    enqueue = (request) => setQueue((q) => [...q, request]);
    return () => {
      enqueue = null;
    };
  }, []);

  function finish(value: unknown) {
    if (!current) return;
    current.resolve(value);
    setQueue((q) => q.slice(1));
  }

  const tone = TONES[current?.tone ?? 'accent'];
  const Icon = current?.Icon;

  return (
    <Modal
      visible={current !== undefined}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => finish(current?.dismissValue)}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => finish(current?.dismissValue)}
          accessibilityLabel="Cerrar"
        />
        {current && (
          <View style={styles.dialog} accessibilityViewIsModal>
            {Icon && (
              <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                <Icon color={tone.fg} size={28} strokeWidth={2.25} />
              </View>
            )}
            <Text style={styles.title}>{current.title}</Text>
            {current.highlight !== undefined && (
              <Text style={styles.highlight} adjustsFontSizeToFit numberOfLines={1}>
                {current.highlight}
              </Text>
            )}
            {current.message !== undefined && <Text style={styles.message}>{current.message}</Text>}
            <View style={styles.actions}>
              {current.actions.map((action) => (
                <Button
                  key={action.label}
                  label={action.label}
                  variant={action.variant ?? 'primary'}
                  onPress={() => finish(action.value)}
                />
              ))}
            </View>
          </View>
        )}
      </View>
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
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: fontSize.title,
    textAlign: 'center',
  },
  highlight: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.numberXL,
    color: colors.accentText,
    marginTop: spacing.sm,
    ...tabularNums,
  },
  message: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
