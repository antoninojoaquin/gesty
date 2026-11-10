import {
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatShortDateTime,
  formatTime,
  formatTimeRange,
  formatWeekdayAndDate,
  formatWeekdayShort,
  monthName,
} from '../dates';
import { at } from '../testing';

// Fri 14/11/2025 21:05 and Sat 15/11/2025 01:10
const start = at(2025, 11, 14, 21, 5);
const end = at(2025, 11, 15, 1, 10);

describe('date formatting', () => {
  it('formats time in 24 h with leading zeros', () => {
    expect(formatTime(start)).toBe('21:05');
    expect(formatTime(end)).toBe('01:10');
    expect(formatTime(at(2025, 11, 15, 0, 0))).toBe('00:00');
  });

  it('formats short date and date-time', () => {
    expect(formatShortDate(start)).toBe('Vie 14/11');
    expect(formatShortDateTime(start)).toBe('Vie 14/11 · 21:05');
    expect(formatShortDate(at(2025, 11, 8))).toBe('Sáb 8/11');
    expect(formatShortDate(at(2025, 11, 12))).toBe('Mié 12/11');
  });

  it('formats history row parts', () => {
    expect(formatWeekdayShort(at(2025, 11, 9))).toBe('Dom');
    expect(formatDayMonth(at(2025, 11, 9))).toBe('9/11');
  });

  it('formats long dates', () => {
    expect(formatLongDate(at(2025, 11, 10))).toBe('Lunes 10 de noviembre');
    expect(formatLongDate(at(2025, 11, 7))).toBe('Viernes 7 de noviembre');
    expect(formatWeekdayAndDate(start)).toBe('viernes 14/11');
  });

  it('formats months', () => {
    expect(monthName(1)).toBe('enero');
    expect(monthName(12)).toBe('diciembre');
    expect(formatMonthYear(2025, 11)).toBe('Noviembre 2025');
    expect(formatMonthYear(2025, 9)).toBe('Septiembre 2025');
  });

  it('formats a time range crossing midnight', () => {
    expect(formatTimeRange(start, end)).toBe('21:05 a 01:10');
  });
});

describe('formatDuration', () => {
  const min = 60_000;
  it.each([
    [0, '0 min'],
    [45 * min, '45 min'],
    [60 * min, '1 h 00 min'],
    [(4 * 60 + 5) * min, '4 h 05 min'],
    [(4 * 60 + 12) * min, '4 h 12 min'],
    [(4 * 60 + 5) * min + 59_000, '4 h 05 min'],
    [-5 * min, '0 min'],
  ])('%d ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('measures a shift crossing midnight', () => {
    expect(formatDuration(end - start)).toBe('4 h 05 min');
  });
});
