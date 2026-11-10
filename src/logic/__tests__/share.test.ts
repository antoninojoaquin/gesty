import { monthShareText, shiftShareText } from '../share';
import { at, shift } from '../testing';

describe('shiftShareText', () => {
  it('matches the format in the spec, crossing midnight', () => {
    const s = { id: 1, startedAt: at(2025, 11, 14, 21, 5), endedAt: at(2025, 11, 15, 1, 10), rate: 3000 };
    expect(shiftShareText(s, 15)).toBe(
      ['Turno Vie 14/11', '21:05 a 01:10 (4 h 05 min)', 'Envíos: 15', 'Tarifa: $ 3.000', 'Total: $ 45.000'].join('\n'),
    );
  });
});

describe('monthShareText', () => {
  it('lists the totals and the shifts in chronological order', () => {
    const shifts = [
      shift(at(2025, 11, 9, 21, 10), at(2025, 11, 10, 0, 48), 10),
      shift(at(2025, 11, 7, 21, 2), at(2025, 11, 8, 1, 14), 15),
      shift(at(2025, 11, 8, 21, 0), at(2025, 11, 9, 1, 0), 14),
    ];
    expect(monthShareText({ year: 2025, month: 11 }, shifts)).toBe(
      [
        'Noviembre 2025',
        'Turnos: 3',
        'Envíos: 39',
        'Total: $ 117.000',
        '',
        'Vie 7/11 · 15 envíos · $ 45.000',
        'Sáb 8/11 · 14 envíos · $ 42.000',
        'Dom 9/11 · 10 envíos · $ 30.000',
      ].join('\n'),
    );
  });

  it('uses the singular for one delivery', () => {
    const text = monthShareText({ year: 2025, month: 10 }, [shift(at(2025, 10, 3, 21), at(2025, 10, 3, 23), 1)]);
    expect(text).toContain('Vie 3/10 · 1 envío · $ 3.000');
  });
});
