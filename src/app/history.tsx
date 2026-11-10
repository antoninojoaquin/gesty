import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { listClosures } from '@/db/months';
import { listShifts } from '@/db/shifts';
import type { Db } from '@/db/types';
import { useFocusQuery } from '@/hooks/useFocusQuery';
import { formatDayMonth, formatMonthYear, formatWeekdayShort, monthName } from '@/logic/dates';
import { formatMoney } from '@/logic/money';
import { groupShiftsByMonth, monthIndex, type MonthGroup, type MonthStatus } from '@/logic/months';
import { deliveriesLabel, shiftsLabel, shiftTotal } from '@/logic/shifts';
import type { ShiftWithCount } from '@/logic/types';
import { colors, fonts, fontSize, icon, radius, spacing, tabularNums, typography } from '@/theme';

async function loadHistory(db: Db) {
  const [shifts, closures] = await Promise.all([listShifts(db), listClosures(db)]);
  return groupShiftsByMonth(shifts, closures, Date.now());
}

export default function History() {
  const { data: months } = useFocusQuery(loadHistory);
  /** Closed months whose shifts were expanded with "Ver turnos de …". */
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton Icon={ChevronLeft} label="Volver" onPress={back} />
        <Text style={typography.title}>Historial</Text>
      </View>

      {months && months.length === 0 && (
        <Text style={[typography.bodyMuted, styles.empty]}>
          Todavía no hay turnos cerrados. Cuando cierres uno, va a aparecer acá.
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {months?.map((m) => {
          const key = monthIndex(m);
          const showShifts = m.status !== 'closed' || expanded.has(key);
          return (
            <MonthCard
              key={key}
              month={m}
              showShifts={showShifts}
              onExpand={() => setExpanded(new Set(expanded).add(key))}
            />
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function openMonth(m: MonthGroup) {
  router.push({ pathname: '/month/[year]/[month]', params: { year: String(m.year), month: String(m.month) } });
}

function MonthCard({ month: m, showShifts, onExpand }: { month: MonthGroup; showShifts: boolean; onExpand: () => void }) {
  const closed = m.status === 'closed';
  return (
    <Card style={styles.month}>
      <Pressable
        onPress={() => openMonth(m)}
        accessibilityRole="button"
        accessibilityHint="Abre el resumen del mes"
        style={styles.monthHeader}
      >
        <Text style={styles.monthTitle}>{formatMonthYear(m.year, m.month)}</Text>
        <StatusChip status={m.status} />
      </Pressable>

      <Pressable onPress={() => openMonth(m)} style={styles.monthTotals} accessible={false}>
        <Text style={styles.monthCounts}>
          {shiftsLabel(m.shiftCount)} · {deliveriesLabel(m.deliveryCount)}
        </Text>
        <Text style={[styles.monthTotal, closed && styles.monthTotalClosed]} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(m.total)}
        </Text>
      </Pressable>

      {showShifts ? (
        <View style={styles.shifts}>
          {m.shifts.map((s) => (
            <ShiftRow key={s.id} shift={s} />
          ))}
        </View>
      ) : (
        <Pressable onPress={onExpand} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkText}>Ver turnos de {monthName(m.month)}</Text>
        </Pressable>
      )}

      {m.status === 'unclosed' && (
        <Button label="Cerrar mes" variant="accentOutline" onPress={() => openMonth(m)} style={styles.closeMonth} />
      )}
    </Card>
  );
}

const CHIP: Record<MonthStatus, { label: string; bg: string; text: string }> = {
  current: { label: 'En curso', bg: colors.accentSoft, text: colors.accentText },
  unclosed: { label: 'Sin cerrar', bg: colors.accentSoft, text: colors.accentText },
  closed: { label: 'Cerrado', bg: colors.surfaceAlt, text: colors.textMuted },
};

function StatusChip({ status }: { status: MonthStatus }) {
  const chip = CHIP[status];
  return (
    <View style={[styles.chip, { backgroundColor: chip.bg }]}>
      {status === 'closed' && <Lock color={chip.text} size={18} strokeWidth={icon.stroke} />}
      <Text style={[styles.chipText, { color: chip.text }]}>{chip.label}</Text>
    </View>
  );
}

function ShiftRow({ shift }: { shift: ShiftWithCount }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/summary/[id]', params: { id: String(shift.id) } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.shift, pressed && styles.shiftPressed]}
    >
      <View style={styles.shiftDate}>
        <Text style={styles.shiftWeekday}>{formatWeekdayShort(shift.startedAt)}</Text>
        <Text style={styles.shiftDay}>{formatDayMonth(shift.startedAt)}</Text>
      </View>
      <Text style={styles.shiftCount}>{deliveriesLabel(shift.deliveryCount)}</Text>
      <Text style={styles.shiftTotal}>{formatMoney(shiftTotal(shift.deliveryCount, shift.rate))}</Text>
      <ChevronRight color={colors.placeholder} size={icon.sizeSmall} strokeWidth={icon.stroke} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  empty: {
    marginTop: spacing.xxl,
  },
  list: {
    gap: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  month: {
    gap: spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  monthTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.title,
    color: colors.text,
    flexShrink: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.caption,
  },
  monthTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  monthCounts: {
    ...typography.bodyMuted,
    ...tabularNums,
    flexShrink: 1,
  },
  monthTotal: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.number,
    color: colors.accentText,
    ...tabularNums,
  },
  monthTotalClosed: {
    color: colors.text,
  },
  shifts: {
    gap: spacing.sm,
  },
  shift: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  shiftPressed: {
    backgroundColor: colors.border,
  },
  shiftDate: {
    width: 60,
  },
  shiftWeekday: {
    ...typography.label,
  },
  shiftDay: {
    fontFamily: fonts.bold,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
    ...tabularNums,
  },
  shiftCount: {
    ...typography.bodyMuted,
    flex: 1,
  },
  shiftTotal: {
    fontFamily: fonts.numberBold,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
    ...tabularNums,
  },
  link: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.body,
    color: colors.accentText,
  },
  closeMonth: {
    marginTop: spacing.xs,
  },
});
