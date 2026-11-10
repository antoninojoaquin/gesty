import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { History, Plus, Settings, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, FlatList, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DeliveryItem } from '@/components/DeliveryItem';
import { EditAddressModal } from '@/components/EditAddressModal';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { addDelivery, deleteDelivery, getAddressUsage, listDeliveries, updateDeliveryAddress } from '@/db/deliveries';
import { closeShift, discardShift, getOpenShift } from '@/db/shifts';
import type { Db } from '@/db/types';
import { useFocusQuery } from '@/hooks/useFocusQuery';
import { confirm, showError } from '@/lib/dialogs';
import { formatTime } from '@/logic/dates';
import { formatMoney } from '@/logic/money';
import {
  closeShiftSummary,
  forgottenShiftMessage,
  isForgottenShift,
  normalizeAddress,
  resolveForgottenShift,
  shiftTotal,
} from '@/logic/shifts';
import { suggestAddresses, timesUsedLabel } from '@/logic/suggestions';
import type { Delivery, Shift } from '@/logic/types';
import { colors, fonts, fontSize, radius, sizes, spacing, tabularNums, typography } from '@/theme';

async function loadShift(db: Db) {
  const shift = await getOpenShift(db);
  if (!shift) return null;
  const [deliveries, usage] = await Promise.all([listDeliveries(db, shift.id), getAddressUsage(db)]);
  return { shift, deliveries, usage };
}

export default function ActiveShift() {
  const db = useSQLiteContext();
  const { data, reload } = useFocusQuery(loadShift);
  const inputRef = useRef<TextInputInstance>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Delivery | null>(null);

  // No open shift (closed elsewhere, discarded, data imported): back to home.
  useEffect(() => {
    if (data === null) router.replace('/');
  }, [data]);

  useForgottenShiftPrompt(db, data?.shift ?? null, data?.deliveries ?? []);

  if (!data) return <Screen>{null}</Screen>;

  const { shift, deliveries, usage } = data;
  const count = deliveries.length;
  const address = normalizeAddress(text);
  const suggestions = suggestAddresses(text, usage);

  async function add(value: string) {
    const clean = normalizeAddress(value);
    if (!clean || busy) return;
    setBusy(true);
    try {
      await addDelivery(db, shift.id, clean, Date.now());
      setText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await reload();
    } catch (e) {
      showError('No se pudo agregar', e);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function onDelete(delivery: Delivery) {
    const ok = await confirm('Borrar envío', `¿Borrás "${delivery.address}"?`, 'Borrar', { destructive: true });
    if (!ok) return;
    try {
      await deleteDelivery(db, delivery.id);
      setExpandedId(null);
      await reload();
    } catch (e) {
      showError('No se pudo borrar', e);
    }
  }

  async function onSaveEdit(newAddress: string) {
    if (!editing) return;
    try {
      await updateDeliveryAddress(db, editing.id, newAddress);
      setEditing(null);
      setExpandedId(null);
      await reload();
    } catch (e) {
      showError('No se pudo guardar', e);
    }
  }

  async function onClose() {
    if (count === 0) {
      const discard = await confirm(
        'No hay envíos',
        'No se puede cerrar un turno sin envíos. ¿Querés descartarlo?',
        'Descartar turno',
        { destructive: true },
      );
      if (!discard) return;
      try {
        await discardShift(db, shift.id);
        router.replace('/');
      } catch (e) {
        showError('No se pudo descartar', e);
      }
      return;
    }
    const ok = await confirm('Cerrar turno', closeShiftSummary(count, shift.rate), 'Cerrar turno');
    if (!ok) return;
    try {
      await closeShift(db, shift.id, Date.now());
      router.replace({ pathname: '/summary/[id]', params: { id: String(shift.id), closed: '1' } });
    } catch (e) {
      showError('No se pudo cerrar', e);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.status}>
          <View style={styles.statusLine}>
            <View style={styles.dot} />
            <Text style={styles.statusText} numberOfLines={1}>
              Turno en curso
            </Text>
          </View>
          <Text style={styles.rate} numberOfLines={1}>
            desde <Text style={styles.statusTime}>{formatTime(shift.startedAt)}</Text> · {formatMoney(shift.rate)} c/u
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <IconButton Icon={History} label="Historial" size={sizes.iconButtonSmall} onPress={() => router.push('/history')} />
          <IconButton Icon={Settings} label="Ajustes" size={sizes.iconButtonSmall} onPress={() => router.push('/settings')} />
        </View>
      </View>

      <Card style={styles.totals}>
        <View>
          <Text style={styles.count} accessibilityLabel={`${count} envíos`}>
            {count}
          </Text>
          <Text style={typography.bodyMuted}>{count === 1 ? 'envío' : 'envíos'}</Text>
        </View>
        <View style={styles.alignEnd}>
          <Text style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(shiftTotal(count, shift.rate))}
          </Text>
          <Text style={typography.bodyMuted}>a cobrar</Text>
        </View>
      </Card>

      <Text style={styles.inputLabel}>Dirección</Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => add(text)}
          submitBehavior="submit"
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          placeholder="Ej: Belgrano 1450"
          placeholderTextColor={colors.placeholder}
          cursorColor={colors.accent}
          selectionColor={colors.accentSoft}
          style={styles.input}
          accessibilityLabel="Dirección"
        />
        <Button label="Agregar" Icon={Plus} onPress={() => add(text)} disabled={!address || busy} style={styles.addButton} />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable
              key={s.address}
              onPress={() => add(s.address)}
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${s.address}`}
              style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
            >
              <Plus color={colors.accentText} size={20} strokeWidth={2.5} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {s.address}
              </Text>
              <Text style={styles.suggestionCount}>{timesUsedLabel(s.count)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={deliveries}
        keyExtractor={(d) => String(d.id)}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <DeliveryItem
            delivery={item}
            number={count - index}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onEdit={() => setEditing(item)}
            onDelete={() => onDelete(item)}
          />
        )}
      />

      <Button label="Cerrar turno" Icon={Square} variant="outline" onPress={onClose} style={styles.closeButton} />

      <EditAddressModal initial={editing?.address ?? null} onCancel={() => setEditing(null)} onSave={onSaveEdit} />
    </Screen>
  );
}

/**
 * Business rule 8: when the app is opened (or comes back to the foreground) with a shift
 * open for more than 12 h, ask whether to close it.
 */
function useForgottenShiftPrompt(db: Db, shift: Shift | null, deliveries: Delivery[]) {
  const asked = useRef<number | null>(null);
  const [appActiveAt, setAppActiveAt] = useState(Date.now());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAppActiveAt(Date.now());
      // Ask again the next time the app is opened.
      if (state === 'background') asked.current = null;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!shift || asked.current === shift.id || !isForgottenShift(shift, appActiveAt)) return;
    asked.current = shift.id;
    const resolution = resolveForgottenShift(deliveries);

    async function closeIt() {
      try {
        if (resolution.action === 'close') {
          await closeShift(db, shift!.id, resolution.endedAt);
          router.replace({ pathname: '/summary/[id]', params: { id: String(shift!.id), closed: '1' } });
        } else {
          const ok = await confirm('Descartar turno', 'El turno no tiene envíos y se va a borrar.', 'Descartar', {
            destructive: true,
          });
          if (!ok) return;
          await discardShift(db, shift!.id);
          router.replace('/');
        }
      } catch (e) {
        showError('No se pudo cerrar el turno', e);
      }
    }

    Alert.alert('Turno abierto', forgottenShiftMessage(shift), [
      { text: 'Seguir con este turno', style: 'cancel' },
      { text: resolution.action === 'close' ? 'Cerrar turno' : 'Descartar turno', onPress: closeIt },
    ]);
  }, [db, shift, deliveries, appActiveAt]);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  status: {
    flex: 1,
    gap: spacing.xs,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  statusText: {
    ...typography.bodyMuted,
    flexShrink: 1,
  },
  statusTime: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  rate: {
    ...typography.bodyMuted,
    ...tabularNums,
    marginLeft: 12 + spacing.sm,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  totals: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  count: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.numberHuge,
    lineHeight: fontSize.numberHuge * 1.1,
    color: colors.text,
    ...tabularNums,
  },
  alignEnd: {
    flex: 1,
    alignItems: 'flex-end',
  },
  total: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.numberXL,
    color: colors.accentText,
    ...tabularNums,
  },
  inputLabel: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: sizes.button,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
  addButton: {
    paddingHorizontal: spacing.lg,
  },
  suggestions: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  suggestion: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  suggestionPressed: {
    backgroundColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.text,
  },
  suggestionCount: {
    ...typography.label,
  },
  list: {
    flex: 1,
    marginTop: spacing.lg,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  closeButton: {
    marginTop: spacing.md,
  },
});
