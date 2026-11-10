import type { ShiftWithCount } from './types';

/** Local timestamp; month is 1–12 like on a calendar. */
export function at(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

let nextId = 1;

/** A closed shift with `deliveryCount` deliveries. */
export function shift(
  startedAt: number,
  endedAt: number | null,
  deliveryCount: number,
  rate = 3000,
): ShiftWithCount {
  return { id: nextId++, startedAt, endedAt, rate, deliveryCount };
}
