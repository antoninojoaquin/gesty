import {
  canCloseMonth,
  formatAverage,
  groupShiftsByMonth,
  isShiftReadOnly,
  monthStats,
  monthStatus,
} from '../months';
import { at, shift } from '../testing';

const NOW = at(2026, 11, 10, 12, 0); // Mon 10/11/2026
const NOV = { year: 2026, month: 11 };
const OCT = { year: 2026, month: 10 };
const SEP = { year: 2026, month: 9 };

// November example from the designs: 3 shifts, 39 deliveries, $ 117.000.
const novShifts = [
  shift(at(2026, 11, 7, 21, 2), at(2026, 11, 8, 1, 14), 15),
  shift(at(2026, 11, 8, 21, 0), at(2026, 11, 9, 1, 0), 14),
  shift(at(2026, 11, 9, 21, 10), at(2026, 11, 10, 0, 48), 10),
];

describe('monthStatus', () => {
  it('the calendar month we are in is "current"', () => {
    expect(monthStatus(NOV, [], NOW)).toBe('current');
  });

  it('a past month not closed is "unclosed"', () => {
    expect(monthStatus(OCT, [], NOW)).toBe('unclosed');
  });

  it('a closed month is "closed"', () => {
    expect(monthStatus(OCT, [OCT], NOW)).toBe('closed');
  });

  it('a future month (clock moved back) counts as current', () => {
    expect(monthStatus({ year: 2026, month: 12 }, [], NOW)).toBe('current');
  });

  it('compares across years', () => {
    expect(monthStatus({ year: 2026, month: 12 }, [], at(2027, 1, 2))).toBe('unclosed');
  });
});

describe('monthStats', () => {
  it('sums shifts, deliveries and money', () => {
    expect(monthStats(novShifts)).toEqual({
      shiftCount: 3,
      deliveryCount: 39,
      total: 117000,
      avgDeliveries: 13,
      avgTotal: 39000,
    });
  });

  it('uses each shift’s own rate', () => {
    const mixed = [shift(at(2026, 10, 3, 21), at(2026, 10, 4, 1), 10, 3000), shift(at(2026, 10, 10, 21), at(2026, 10, 11, 1), 10, 3500)];
    expect(monthStats(mixed).total).toBe(65000);
  });

  it('rounds the average total to the peso', () => {
    const shifts = [
      shift(at(2026, 10, 3, 21), at(2026, 10, 4, 1), 1, 1000),
      shift(at(2026, 10, 4, 21), at(2026, 10, 5, 1), 1, 1000),
      shift(at(2026, 10, 5, 21), at(2026, 10, 6, 1), 0, 1000),
    ];
    expect(monthStats(shifts).avgTotal).toBe(667);
  });

  it('handles an empty month', () => {
    expect(monthStats([])).toEqual({ shiftCount: 0, deliveryCount: 0, total: 0, avgDeliveries: 0, avgTotal: 0 });
  });
});

describe('formatAverage', () => {
  it.each([
    [13, '13'],
    [40 / 3, '13,3'],
    [12.96, '13'],
    [12.95, '13'],
    [0.25, '0,3'],
    [0, '0'],
  ])('%p → %s', (value, expected) => {
    expect(formatAverage(value)).toBe(expected);
  });
});

describe('groupShiftsByMonth', () => {
  it('groups by the month of the start, most recent first, with status', () => {
    const crossing = shift(at(2026, 10, 31, 22, 0), at(2026, 11, 1, 2, 0), 12); // belongs to October
    const sep = shift(at(2026, 9, 5, 21), at(2026, 9, 6, 1), 8);
    const groups = groupShiftsByMonth([...novShifts, crossing, sep], [SEP], NOW);

    expect(groups.map((g) => [g.year, g.month, g.status, g.shiftCount])).toEqual([
      [2026, 11, 'current', 3],
      [2026, 10, 'unclosed', 1],
      [2026, 9, 'closed', 1],
    ]);
    expect(groups[0].total).toBe(117000);
    expect(groups[1].shifts[0]).toBe(crossing);
  });

  it('sorts shifts inside a month most recent first', () => {
    const [nov] = groupShiftsByMonth(novShifts, [], NOW);
    expect(nov.shifts.map((s) => s.deliveryCount)).toEqual([10, 14, 15]);
  });

  it('ignores the open shift', () => {
    const openShift = shift(at(2026, 11, 10, 21), null, 4);
    const [nov] = groupShiftsByMonth([...novShifts, openShift], [], NOW);
    expect(nov.shiftCount).toBe(3);
  });

  it('groups across the year change', () => {
    const dec = shift(at(2026, 12, 31, 22), at(2027, 1, 1, 2), 5);
    const jan = shift(at(2027, 1, 2, 21), at(2027, 1, 3, 1), 6);
    const groups = groupShiftsByMonth([dec, jan], [], at(2027, 1, 10));
    expect(groups.map((g) => [g.year, g.month])).toEqual([
      [2027, 1],
      [2026, 12],
    ]);
  });

  it('returns nothing without shifts', () => {
    expect(groupShiftsByMonth([], [], NOW)).toEqual([]);
  });
});

describe('canCloseMonth', () => {
  const octShift = shift(at(2026, 10, 17, 21), at(2026, 10, 18, 1), 12);

  it('allows a finished month with closed shifts', () => {
    expect(canCloseMonth(OCT, [octShift, ...novShifts], [], NOW)).toEqual({ ok: true });
  });

  it('refuses the current month', () => {
    expect(canCloseMonth(NOV, novShifts, [], NOW)).toMatchObject({ ok: false, reason: 'not-finished' });
  });

  it('refuses a month already closed', () => {
    expect(canCloseMonth(OCT, [octShift], [OCT], NOW)).toMatchObject({ ok: false, reason: 'already-closed' });
  });

  it('refuses a month with an open (forgotten) shift', () => {
    const forgotten = shift(at(2026, 10, 31, 21), null, 3);
    expect(canCloseMonth(OCT, [octShift, forgotten], [], NOW)).toMatchObject({ ok: false, reason: 'open-shift' });
  });

  it('refuses a month without shifts', () => {
    expect(canCloseMonth(SEP, novShifts, [], NOW)).toMatchObject({ ok: false, reason: 'no-shifts' });
  });

  it('can close the previous month right after it ends', () => {
    expect(canCloseMonth(OCT, [octShift], [], at(2026, 11, 1, 0, 0))).toEqual({ ok: true });
    expect(canCloseMonth(OCT, [octShift], [], at(2026, 10, 31, 23, 59))).toMatchObject({ reason: 'not-finished' });
  });

  it('includes a message for the user', () => {
    const result = canCloseMonth(NOV, novShifts, [], NOW);
    expect(result.ok === false && result.message).toBe('Solo se pueden cerrar meses que ya terminaron.');
  });
});

describe('isShiftReadOnly', () => {
  it('closed shifts of a closed month are read-only', () => {
    const s = shift(at(2026, 10, 31, 22), at(2026, 11, 1, 2), 5);
    expect(isShiftReadOnly(s, [OCT])).toBe(true);
    expect(isShiftReadOnly(s, [NOV])).toBe(false);
    expect(isShiftReadOnly(s, [])).toBe(false);
  });

  it('the open shift is never read-only', () => {
    expect(isShiftReadOnly(shift(at(2026, 10, 31, 22), null, 0), [OCT])).toBe(false);
  });
});
