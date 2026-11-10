import { monthKeyOf, shiftTotal } from './shifts';
import type { MonthKey, Shift, ShiftWithCount } from './types';

/**
 * - `current`: the calendar month we are in (cannot be closed yet).
 * - `unclosed`: a past month that has not been closed ("Sin cerrar").
 * - `closed`: closed; its shifts are read-only.
 */
export type MonthStatus = 'current' | 'unclosed' | 'closed';

export type MonthStats = {
  shiftCount: number;
  deliveryCount: number;
  total: number;
  /** Average deliveries per shift (not rounded; format with `formatAverage`). */
  avgDeliveries: number;
  /** Average pesos per shift, rounded to the peso. */
  avgTotal: number;
};

export type MonthGroup = MonthKey &
  MonthStats & {
    status: MonthStatus;
    /** Most recent first. */
    shifts: ShiftWithCount[];
  };

/** Sortable number for a month: 2026-11 → 202611. */
export function monthIndex({ year, month }: MonthKey): number {
  return year * 100 + month;
}

export function sameMonth(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isMonthClosed(key: MonthKey, closures: readonly MonthKey[]): boolean {
  return closures.some((c) => sameMonth(c, key));
}

export function monthStatus(key: MonthKey, closures: readonly MonthKey[], now: number): MonthStatus {
  if (isMonthClosed(key, closures)) return 'closed';
  // A month that has not finished (or a future one, if the clock moved) counts as current.
  return monthIndex(key) >= monthIndex(monthKeyOf(now)) ? 'current' : 'unclosed';
}

export function monthStats(shifts: readonly ShiftWithCount[]): MonthStats {
  const shiftCount = shifts.length;
  const deliveryCount = shifts.reduce((sum, s) => sum + s.deliveryCount, 0);
  const total = shifts.reduce((sum, s) => sum + shiftTotal(s.deliveryCount, s.rate), 0);
  return {
    shiftCount,
    deliveryCount,
    total,
    avgDeliveries: shiftCount === 0 ? 0 : deliveryCount / shiftCount,
    avgTotal: shiftCount === 0 ? 0 : Math.round(total / shiftCount),
  };
}

/** `13` → `"13"`, `13.333` → `"13,3"`: one decimal only when it is not exact. */
export function formatAverage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

/**
 * Groups CLOSED shifts by the month of their start (rule 3), most recent month first,
 * each month's shifts most recent first. Open shifts are ignored.
 */
export function groupShiftsByMonth(
  shifts: readonly ShiftWithCount[],
  closures: readonly MonthKey[],
  now: number,
): MonthGroup[] {
  const byMonth = new Map<number, ShiftWithCount[]>();
  for (const shift of shifts) {
    if (shift.endedAt === null) continue;
    const index = monthIndex(monthKeyOf(shift.startedAt));
    const list = byMonth.get(index) ?? [];
    list.push(shift);
    byMonth.set(index, list);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => b - a)
    .map(([index, list]) => {
      const key: MonthKey = { year: Math.floor(index / 100), month: index % 100 };
      const sorted = [...list].sort((a, b) => b.startedAt - a.startedAt);
      return { ...key, ...monthStats(sorted), status: monthStatus(key, closures, now), shifts: sorted };
    });
}

export type CloseMonthCheck =
  | { ok: true }
  | { ok: false; reason: 'already-closed' | 'not-finished' | 'open-shift' | 'no-shifts'; message: string };

/**
 * Business rule 9: a month can be closed when it already finished, is not closed,
 * has at least one closed shift and no open shift.
 * `shifts` may include shifts of other months; only this month's are considered.
 */
export function canCloseMonth(
  key: MonthKey,
  shifts: readonly Shift[],
  closures: readonly MonthKey[],
  now: number,
): CloseMonthCheck {
  if (isMonthClosed(key, closures)) {
    return { ok: false, reason: 'already-closed', message: 'Este mes ya está cerrado.' };
  }
  if (monthStatus(key, closures, now) === 'current') {
    return { ok: false, reason: 'not-finished', message: 'Solo se pueden cerrar meses que ya terminaron.' };
  }
  const inMonth = shifts.filter((s) => sameMonth(monthKeyOf(s.startedAt), key));
  if (inMonth.some((s) => s.endedAt === null)) {
    return {
      ok: false,
      reason: 'open-shift',
      message: 'Hay un turno abierto de este mes. Cerralo antes de cerrar el mes.',
    };
  }
  if (inMonth.length === 0) {
    return { ok: false, reason: 'no-shifts', message: 'Este mes no tiene turnos cerrados.' };
  }
  return { ok: true };
}

/** Shifts of a closed month are read-only (rule 9). Open shifts are always editable. */
export function isShiftReadOnly(shift: Shift, closures: readonly MonthKey[]): boolean {
  return shift.endedAt !== null && isMonthClosed(monthKeyOf(shift.startedAt), closures);
}
