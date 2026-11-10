import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Check, ChevronLeft, Lock, Pencil, Share2, Trash2 } from '@/components/icons';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EditAddressModal } from '@/components/EditAddressModal';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { deleteDelivery, listDeliveries, updateDeliveryAddress } from '@/db/deliveries';
import { listClosures } from '@/db/months';
import { deleteShift, getShift } from '@/db/shifts';
import type { Db } from '@/db/types';
import { useFocusQuery } from '@/hooks/useFocusQuery';
import { confirm, showError } from '@/lib/dialogs';
import { formatDuration, formatLongDate, formatTime, formatTimeRange } from '@/logic/dates';
import { formatMoney } from '@/logic/money';
import { isShiftReadOnly } from '@/logic/months';
import { shiftShareText } from '@/logic/share';
import { deliveriesLabel, shiftTotal } from '@/logic/shifts';
import type { ClosedShift, Delivery } from '@/logic/types';
import { colors, fonts, fontSize, icon, radius, spacing, tabularNums, typography } from '@/theme';

/** How many addresses are shown before "Ver las N direcciones". */
const PREVIEW_COUNT = 4;

function loadSummary(id: number) {
  return async (db: Db) => {
    const shift = await getShift(db, id);
    if (!shift || shift.endedAt === null) return null;
    const [deliveries, closures] = await Promise.all([listDeliveries(db, id), listClosures(db)]);
    return { shift: shift as ClosedShift, deliveries, readOnly: isShiftReadOnly(shift, closures) };
  };
}

export default function ShiftSummary() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string; closed?: string }>();
  const id = Number(params.id);
  /** Just closed from the active shift screen (vs. opened from the history). */
  const justClosed = params.closed === '1';
  const { data, reload } = useFocusQuery(loadSummary(id));
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Delivery | null>(null);

  const goHome = () => router.replace('/');
  const goBack = () => (justClosed || !router.canGoBack() ? goHome() : router.back());

  // After closing a shift there is nothing behind this screen: Android "back" goes home.
  useEffect(() => {
    if (!justClosed) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [justClosed]);

  // The shift was deleted (or does not exist).
  useEffect(() => {
    if (data === null) goBack();
  }, [data]);

  if (!data) return <Screen>{null}</Screen>;

  const { shift, deliveries, readOnly } = data;
  const count = deliveries.length;
  const visible = showAll ? deliveries : deliveries.slice(0, PREVIEW_COUNT);

  async function onShare() {
    await Share.share({ message: shiftShareText(shift, count) });
  }

  async function onDeleteDelivery(delivery: Delivery) {
    const ok = await confirm('¿Borrás este envío?', delivery.address, 'Borrar', { destructive: true, Icon: Trash2 });
    if (!ok) return;
    try {
      await deleteDelivery(db, delivery.id);
      setExpandedId(null);
      await reload();
    } catch (e) {
      showError('No se pudo borrar', e);
    }
  }

  async function onSaveEdit(address: string) {
    if (!editing) return;
    try {
      await updateDeliveryAddress(db, editing.id, address);
      setEditing(null);
      setExpandedId(null);
      await reload();
    } catch (e) {
      showError('No se pudo guardar', e);
    }
  }

  async function onDeleteShift() {
    const ok = await confirm(
      '¿Borrás el turno?',
      `Se borran el turno del ${formatLongDate(shift.startedAt).toLowerCase()} y sus ${deliveriesLabel(count)}.`,
      'Borrar turno',
      { destructive: true, Icon: Trash2 },
    );
    if (!ok) return;
    try {
      await deleteShift(db, shift.id);
      goBack();
    } catch (e) {
      showError('No se pudo borrar', e);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {justClosed ? (
          <View style={styles.badge}>
            <Check color={colors.accentText} size={30} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={styles.backRow}>
            <IconButton Icon={ChevronLeft} label="Volver" onPress={goBack} />
          </View>
        )}

        <Text style={styles.kicker}>Turno cerrado</Text>
        <Text style={styles.title}>{formatLongDate(shift.startedAt)}</Text>
        <Text style={styles.times}>
          {formatTimeRange(shift.startedAt, shift.endedAt)} · {formatDuration(shift.endedAt - shift.startedAt)}
        </Text>

        <Card style={styles.totalCard}>
          <Text style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(shiftTotal(count, shift.rate))}
          </Text>
          <Text style={styles.formula}>
            <Text style={styles.formulaValue}>{count}</Text> {count === 1 ? 'envío' : 'envíos'}
            {'  ×  '}
            <Text style={styles.formulaValue}>{formatMoney(shift.rate)}</Text>
          </Text>
        </Card>

        {readOnly && (
          <View style={styles.readOnly}>
            <Lock color={colors.textMuted} size={icon.sizeSmall} strokeWidth={icon.stroke} />
            <Text style={styles.readOnlyText}>El mes está cerrado: este turno es solo lectura.</Text>
          </View>
        )}

        {count > 0 && <Text style={[typography.overline, styles.sectionTitle]}>Direcciones</Text>}
        {visible.map((d, index) => {
          const expanded = expandedId === d.id;
          return (
            <View key={d.id} style={styles.addressItem}>
              <Pressable
                disabled={readOnly}
                onPress={() => setExpandedId(expanded ? null : d.id)}
                accessibilityRole={readOnly ? undefined : 'button'}
                style={styles.addressRow}
              >
                <Text style={styles.addressNumber}>{count - index}</Text>
                <Text style={styles.address} numberOfLines={2}>
                  {d.address}
                </Text>
                <Text style={styles.addressTime}>{formatTime(d.createdAt)}</Text>
              </Pressable>
              {expanded && (
                <View style={styles.actions}>
                  <Button label="Editar" Icon={Pencil} variant="secondary" small onPress={() => setEditing(d)} style={styles.action} />
                  <Button label="Borrar" Icon={Trash2} variant="danger" small onPress={() => onDeleteDelivery(d)} style={styles.action} />
                </View>
              )}
            </View>
          );
        })}
        {!showAll && count > PREVIEW_COUNT && (
          <Pressable onPress={() => setShowAll(true)} accessibilityRole="button" style={styles.link}>
            <Text style={styles.linkText}>Ver las {count} direcciones</Text>
          </Pressable>
        )}

        {!readOnly && !justClosed && (
          <Button label="Borrar turno" Icon={Trash2} variant="danger" onPress={onDeleteShift} style={styles.deleteShift} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Compartir por WhatsApp" Icon={Share2} onPress={onShare} />
        {justClosed && <Button label="Volver al inicio" variant="outline" onPress={goHome} />}
      </View>

      <EditAddressModal initial={editing?.address ?? null} onCancel={() => setEditing(null)} onSave={onSaveEdit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    paddingBottom: spacing.xl,
  },
  badge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  backRow: {
    alignSelf: 'flex-start',
  },
  kicker: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  times: {
    ...typography.bodyMuted,
    ...tabularNums,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  totalCard: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  total: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.numberHuge,
    color: colors.accentText,
    ...tabularNums,
  },
  formula: {
    ...typography.bodyMuted,
    fontSize: fontSize.bodyLarge,
  },
  formulaValue: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  readOnlyText: {
    ...typography.label,
    flex: 1,
  },
  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xs,
  },
  addressItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  addressNumber: {
    minWidth: 28,
    ...typography.bodyMuted,
    ...tabularNums,
  },
  address: {
    ...typography.body,
    flex: 1,
    paddingVertical: spacing.md,
  },
  addressTime: {
    ...typography.bodyMuted,
    ...tabularNums,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  action: {
    flex: 1,
  },
  link: {
    paddingVertical: spacing.lg,
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.accentText,
  },
  deleteShift: {
    marginTop: spacing.xxl,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
});
