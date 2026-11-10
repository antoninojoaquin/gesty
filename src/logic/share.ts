import { formatDuration, formatMonthYear, formatShortDate, formatTimeRange } from './dates';
import { monthStats } from './months';
import { formatMoney } from './money';
import { shiftTotal } from './shifts';
import type { ClosedShift, MonthKey, ShiftWithCount } from './types';

/**
 * Text shared over WhatsApp for a closed shift (SPEC §4.3):
 *
 *   Turno Vie 14/11
 *   21:05 a 01:10 (4 h 05 min)
 *   Envíos: 15
 *   Tarifa: $ 3.000
 *   Total: $ 45.000
 */
export function shiftShareText(shift: ClosedShift, deliveryCount: number): string {
  return [
    `Turno ${formatShortDate(shift.startedAt)}`,
    `${formatTimeRange(shift.startedAt, shift.endedAt)} (${formatDuration(shift.endedAt - shift.startedAt)})`,
    `Envíos: ${deliveryCount}`,
    `Tarifa: ${formatMoney(shift.rate)}`,
    `Total: ${formatMoney(shiftTotal(deliveryCount, shift.rate))}`,
  ].join('\n');
}

/**
 * Text shared over WhatsApp for a month (SPEC §4.5), shifts in chronological order:
 *
 *   Noviembre 2026
 *   Turnos: 3
 *   Envíos: 39
 *   Total: $ 117.000
 *
 *   Vie 7/11 · 15 envíos · $ 45.000
 *   …
 */
export function monthShareText(key: MonthKey, shifts: readonly ShiftWithCount[]): string {
  const stats = monthStats(shifts);
  const lines = [...shifts]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map(
      (s) =>
        `${formatShortDate(s.startedAt)} · ${s.deliveryCount} ${s.deliveryCount === 1 ? 'envío' : 'envíos'} · ${formatMoney(
          shiftTotal(s.deliveryCount, s.rate),
        )}`,
    );
  return [
    formatMonthYear(key.year, key.month),
    `Turnos: ${stats.shiftCount}`,
    `Envíos: ${stats.deliveryCount}`,
    `Total: ${formatMoney(stats.total)}`,
    '',
    ...lines,
  ].join('\n');
}
