import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft, Info, Lock, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { closeMonth, listClosures, reopenMonth } from '@/db/months';
import { listShifts } from '@/db/shifts';
import type { Db } from '@/db/types';
import { useFocusQuery } from '@/hooks/useFocusQuery';
import { confirm, showError } from '@/lib/dialogs';
import { formatMonthYear, formatShortDate, monthName } from '@/logic/dates';
import { formatMoney } from '@/logic/money';
import { canCloseMonth, formatAverage, groupShiftsByMonth, sameMonth } from '@/logic/months';
import { monthShareText } from '@/logic/share';
import { deliveriesLabel, shiftTotal } from '@/logic/shifts';
import type { MonthKey } from '@/logic/types';
import { colors, fonts, fontSize, icon, radius, spacing, tabularNums, typography } from '@/theme';

function loadMonth(key: MonthKey) {
  return async (db: Db) => {
    const now = Date.now();
    const [shifts, closures] = await Promise.all([listShifts(db), listClosures(db)]);
    const group = groupShiftsByMonth(shifts, closures, now).find((g) => sameMonth(g, key)) ?? null;
    const closure = closures.find((c) => sameMonth(c, key)) ?? null;
    return { group, closure, check: canCloseMonth(key, shifts, closures, now) };
  };
}

export default function MonthClose() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ year: string; month: string }>();
  const key: MonthKey = { year: Number(params.year), month: Number(params.month) };
  const { data, reload } = useFocusQuery(loadMonth(key));
  const [busy, setBusy] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/history'));
  const title = formatMonthYear(key.year, key.month);
  const name = monthName(key.month);

  if (!data) return <Screen>{null}</Screen>;
  const { group, closure, check } = data;
  const status = group?.status ?? (closure ? 'closed' : 'current');
  const kicker = status === 'closed' ? 'Mes cerrado' : status === 'unclosed' ? 'Cerrar mes' : 'Mes en curso';

  async function onConfirmClose() {
    if (busy) return;
    const ok = await confirm(
      'Cerrar mes',
      `Los turnos de ${name} van a quedar solo lectura. Podés reabrirlo desde el historial.`,
      'Cerrar mes',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await closeMonth(db, key, Date.now());
      back();
    } catch (e) {
      showError('No se pudo cerrar el mes', e);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function onReopen() {
    const ok = await confirm(
      'Reabrir mes',
      `Los turnos de ${name} se van a poder editar de nuevo. Después podés volver a cerrarlo.`,
      'Reabrir mes',
    );
    if (!ok) return;
    try {
      await reopenMonth(db, key);
      await reload();
    } catch (e) {
      showError('No se pudo reabrir el mes', e);
    }
  }

  async function onShare() {
    if (group) await Share.share({ message: monthShareText(key, group.shifts) });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton Icon={ChevronLeft} label="Volver" onPress={back} />
        <View style={styles.headerText}>
          <Text style={typography.bodyMuted}>{kicker}</Text>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!group ? (
          <Text style={[typography.bodyMuted, styles.empty]}>Este mes no tiene turnos cerrados.</Text>
        ) : (
          <>
            <Card style={styles.totalCard}>
              <Text style={typography.bodyMuted}>Total del mes</Text>
              <Text style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(group.total)}
              </Text>
              <View style={styles.tiles}>
                <Tile value={String(group.shiftCount)} label={group.shiftCount === 1 ? 'turno' : 'turnos'} />
                <Tile value={String(group.deliveryCount)} label={group.deliveryCount === 1 ? 'envío' : 'envíos'} />
                <Tile value={formatAverage(group.avgDeliveries)} label="envíos por turno" />
                <Tile value={formatMoney(group.avgTotal)} label="por turno" />
              </View>
            </Card>

            <View style={styles.shifts}>
              {group.shifts.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push({ pathname: '/summary/[id]', params: { id: String(s.id) } })}
                  accessibilityRole="button"
                  style={styles.shiftRow}
                >
                  <Text style={styles.shiftDate}>{formatShortDate(s.startedAt)}</Text>
                  <Text style={styles.shiftCount}>{deliveriesLabel(s.deliveryCount)}</Text>
                  <Text style={styles.shiftTotal}>{formatMoney(shiftTotal(s.deliveryCount, s.rate))}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Note status={status} check={check} monthName={name} closedAt={closure?.closedAt} />
        {status === 'unclosed' && (
          <Button label="Confirmar cierre" onPress={onConfirmClose} disabled={!check.ok || busy} />
        )}
        {status === 'closed' && <Button label="Reabrir mes" variant="accentOutline" onPress={onReopen} />}
        {group && <Button label="Compartir por WhatsApp" Icon={Share2} variant="outline" onPress={onShare} />}
      </View>
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function Note({
  status,
  check,
  monthName: name,
  closedAt,
}: {
  status: 'current' | 'unclosed' | 'closed';
  check: ReturnType<typeof canCloseMonth>;
  monthName: string;
  closedAt?: number;
}) {
  let text: string;
  let Icon = Info;
  if (status === 'closed') {
    Icon = Lock;
    text = `Mes cerrado${closedAt ? ` el ${formatShortDate(closedAt)}` : ''}. Los turnos de ${name} son solo lectura; si necesitás corregir algo, reabrilo.`;
  } else if (status === 'current') {
    text = `El mes todavía no terminó. Vas a poder cerrarlo a partir del 1° del mes que viene.`;
  } else if (!check.ok) {
    text = check.message;
  } else {
    text = `Al cerrarlo, los turnos de ${name} quedan solo lectura. Si necesitás corregir algo, podés reabrirlo desde el historial.`;
  }
  return (
    <View style={styles.note}>
      <Icon color={colors.textMuted} size={icon.sizeSmall} strokeWidth={icon.stroke} style={styles.noteIcon} />
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.number,
    color: colors.text,
  },
  content: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  empty: {
    marginTop: spacing.lg,
  },
  totalCard: {
    gap: spacing.xs,
  },
  total: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.numberHuge,
    color: colors.accentText,
    ...tabularNums,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  tileValue: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.number,
    color: colors.text,
    ...tabularNums,
  },
  tileLabel: {
    ...typography.label,
  },
  shifts: {
    marginTop: spacing.xl,
  },
  shiftRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shiftDate: {
    ...typography.bodyMuted,
    ...tabularNums,
    width: 96,
  },
  shiftCount: {
    ...typography.body,
    flex: 1,
  },
  shiftTotal: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
    ...tabularNums,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  noteIcon: {
    marginTop: 2,
  },
  noteText: {
    ...typography.bodyMuted,
    flex: 1,
  },
});
