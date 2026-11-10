import { formatTime, formatWeekdayAndDate } from './dates';
import { formatMoney } from './money';
import type { Delivery, MonthKey, Shift } from './types';

/** Business rule 1: total = deliveries × the shift's own rate. */
export function shiftTotal(deliveryCount: number, rate: number): number {
  return deliveryCount * rate;
}

/** Business rule 3: a shift belongs to the local day and month of its start. */
export function monthKeyOf(ts: number): MonthKey {
  const d = new Date(ts);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isOpen(shift: Shift): boolean {
  return shift.endedAt === null;
}

/** Business rule 7: a shift with no deliveries cannot be closed (only discarded). */
export function canCloseShift(deliveryCount: number): boolean {
  return deliveryCount > 0;
}

/** Addresses are stored trimmed. Returns null when nothing is left. */
export function normalizeAddress(input: string): string | null {
  const trimmed = input.trim();
  return trimmed === '' ? null : trimmed;
}

export const FORGOTTEN_SHIFT_HOURS = 12;

/** Business rule 8: an open shift that started more than 12 h ago. */
export function isForgottenShift(shift: Shift, now: number): boolean {
  return isOpen(shift) && now - shift.startedAt > FORGOTTEN_SHIFT_HOURS * 60 * 60 * 1000;
}

export type ForgottenShiftResolution =
  /** Close it with `endedAt` = time of the last delivery. */
  | { action: 'close'; endedAt: number }
  /** No deliveries: it cannot be closed (rule 7), only discarded. */
  | { action: 'discard' };

/** What the "forgotten shift" prompt offers for this shift. */
export function resolveForgottenShift(deliveries: readonly Pick<Delivery, 'createdAt'>[]): ForgottenShiftResolution {
  if (deliveries.length === 0) return { action: 'discard' };
  const endedAt = Math.max(...deliveries.map((d) => d.createdAt));
  return { action: 'close', endedAt };
}

/** "Tenés un turno abierto desde el viernes 14/11 a las 21:05. ¿Lo cerrás?" */
export function forgottenShiftMessage(shift: Shift): string {
  return `Tenés un turno abierto desde el ${formatWeekdayAndDate(shift.startedAt)} a las ${formatTime(
    shift.startedAt,
  )}. ¿Lo cerrás?`;
}

/** Business rule 10: shown when the rate changes while a shift is open. */
export function rateChangeNotice(openShiftRate: number): string {
  return `El turno actual sigue con ${formatMoney(openShiftRate)}. La nueva tarifa se aplica desde el próximo turno.`;
}

/** "15 envíos" / "1 envío" */
export function deliveriesLabel(count: number): string {
  return `${count} ${count === 1 ? 'envío' : 'envíos'}`;
}

/** Confirmation before closing a shift: "15 envíos × $ 3.000 = $ 45.000" */
export function closeShiftSummary(deliveryCount: number, rate: number): string {
  return `${deliveriesLabel(deliveryCount)} × ${formatMoney(rate)} = ${formatMoney(shiftTotal(deliveryCount, rate))}`;
}

/** "3 turnos" / "1 turno" */
export function shiftsLabel(count: number): string {
  return `${count} ${count === 1 ? 'turno' : 'turnos'}`;
}
