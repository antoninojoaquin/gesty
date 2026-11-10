/**
 * Date formatting in Spanish (Argentina), 24 h, always in the phone's local time.
 * Implemented by hand instead of Intl so the output is identical on every device.
 * Timestamps are Unix milliseconds.
 */

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `"21:05"` */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `"Vie 14/11"` */
export function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** `"Vie 14/11 · 21:05"` */
export function formatShortDateTime(ts: number): string {
  return `${formatShortDate(ts)} · ${formatTime(ts)}`;
}

/** Weekday abbreviation alone: `"Vie"` (history rows). */
export function formatWeekdayShort(ts: number): string {
  return WEEKDAYS_SHORT[new Date(ts).getDay()];
}

/** Day and month alone: `"14/11"` (history rows). */
export function formatDayMonth(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** `"Viernes 14 de noviembre"` */
export function formatLongDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** `"viernes 14/11"`, for use inside a sentence. */
export function formatWeekdayAndDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS_LONG[d.getDay()].toLowerCase()} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Month name alone, lowercase: `"noviembre"` (month is 1–12). */
export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** `"Noviembre 2026"` (month is 1–12). */
export function formatMonthYear(year: number, month: number): string {
  return `${capitalize(monthName(month))} ${year}`;
}

/** `"21:05 a 01:10"` */
export function formatTimeRange(start: number, end: number): string {
  return `${formatTime(start)} a ${formatTime(end)}`;
}

/**
 * `"4 h 05 min"`: minutes always with two digits. Under one hour: `"45 min"`.
 * Seconds are truncated.
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${pad2(minutes)} min`;
}
