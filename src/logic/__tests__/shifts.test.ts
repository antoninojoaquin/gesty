import {
  canCloseShift,
  closeShiftSummary,
  deliveriesLabel,
  shiftsLabel,
  forgottenShiftMessage,
  isForgottenShift,
  monthKeyOf,
  normalizeAddress,
  rateChangeNotice,
  resolveForgottenShift,
  shiftTotal,
} from '../shifts';
import type { Shift } from '../types';
import { at } from '../testing';

const open = (startedAt: number): Shift => ({ id: 1, startedAt, endedAt: null, rate: 3000 });

describe('shiftTotal', () => {
  it('is deliveries × rate', () => {
    expect(shiftTotal(15, 3000)).toBe(45000);
    expect(shiftTotal(0, 3000)).toBe(0);
  });
});

describe('monthKeyOf (shift belongs to its start)', () => {
  it('a Friday-night shift ending on Saturday belongs to Friday’s month', () => {
    expect(monthKeyOf(at(2025, 11, 14, 21, 0))).toEqual({ year: 2025, month: 11 });
  });

  it('a shift starting on the last night of the month belongs to that month', () => {
    // Starts Sat 31/10 22:00, ends Sun 1/11 02:00 → October.
    expect(monthKeyOf(at(2025, 10, 31, 22, 0))).toEqual({ year: 2025, month: 10 });
  });

  it('handles the year change', () => {
    expect(monthKeyOf(at(2025, 12, 31, 23, 30))).toEqual({ year: 2025, month: 12 });
    expect(monthKeyOf(at(2027, 1, 1, 0, 30))).toEqual({ year: 2027, month: 1 });
  });
});

describe('closing and addresses', () => {
  it('cannot close a shift with no deliveries', () => {
    expect(canCloseShift(0)).toBe(false);
    expect(canCloseShift(1)).toBe(true);
  });

  it('trims addresses and rejects blank ones', () => {
    expect(normalizeAddress('  Belgrano 1450 ')).toBe('Belgrano 1450');
    expect(normalizeAddress('   ')).toBeNull();
    expect(normalizeAddress('')).toBeNull();
  });
});

describe('forgotten shift', () => {
  const startedAt = at(2025, 11, 14, 21, 5);

  it('is forgotten only after more than 12 hours open', () => {
    expect(isForgottenShift(open(startedAt), at(2025, 11, 15, 9, 5))).toBe(false);
    expect(isForgottenShift(open(startedAt), at(2025, 11, 15, 9, 6))).toBe(true);
  });

  it('a closed shift is never forgotten', () => {
    const closed: Shift = { ...open(startedAt), endedAt: at(2025, 11, 15, 1, 0) };
    expect(isForgottenShift(closed, at(2025, 11, 20))).toBe(false);
  });

  it('closes at the time of the last delivery', () => {
    const deliveries = [{ createdAt: at(2025, 11, 14, 22, 0) }, { createdAt: at(2025, 11, 15, 0, 40) }, { createdAt: at(2025, 11, 14, 23, 0) }];
    expect(resolveForgottenShift(deliveries)).toEqual({ action: 'close', endedAt: at(2025, 11, 15, 0, 40) });
  });

  it('offers to discard when it has no deliveries', () => {
    expect(resolveForgottenShift([])).toEqual({ action: 'discard' });
  });

  it('builds the prompt message', () => {
    expect(forgottenShiftMessage(open(startedAt))).toBe(
      'Tenés un turno abierto desde el viernes 14/11 a las 21:05. ¿Lo cerrás?',
    );
  });
});

describe('rateChangeNotice', () => {
  it('tells which rate the open shift keeps', () => {
    expect(rateChangeNotice(3000)).toBe(
      'El turno actual sigue con $ 3.000. La nueva tarifa se aplica desde el próximo turno.',
    );
  });
});

describe('labels', () => {
  it('pluralizes deliveries', () => {
    expect(deliveriesLabel(1)).toBe('1 envío');
    expect(deliveriesLabel(15)).toBe('15 envíos');
  });

  it('summarizes a shift before closing it', () => {
    expect(closeShiftSummary(15, 3000)).toBe('15 envíos × $ 3.000 = $ 45.000');
  });
});

describe('shiftsLabel', () => {
  it('pluralizes shifts', () => {
    expect(shiftsLabel(1)).toBe('1 turno');
    expect(shiftsLabel(3)).toBe('3 turnos');
  });
});
