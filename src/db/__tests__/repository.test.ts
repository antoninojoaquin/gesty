import { buildBackup, parseBackup, serializeBackup } from '@/logic/backup';
import { at } from '@/logic/testing';

import { exportData, importData } from '../backup';
import {
  addDelivery,
  deleteDelivery,
  getAddressUsage,
  listDeliveries,
  updateDeliveryAddress,
} from '../deliveries';
import { closeMonth, listClosures, reopenMonth } from '../months';
import { getRate, setRate } from '../settings';
import {
  closeShift,
  deleteShift,
  discardShift,
  getLastClosedShift,
  getOpenShift,
  getShift,
  listShifts,
  startShift,
} from '../shifts';
import { createMigratedTestDb } from '../testing';
import { UserError, type Db } from '../types';

let db: Db;
beforeEach(async () => {
  ({ db } = await createMigratedTestDb());
});

const OCT = { year: 2026, month: 10 };

/** A closed shift in October 2026 with the given addresses. */
async function closedOctoberShift(day: number, addresses: string[]) {
  const shift = await startShift(db, at(2026, 10, day, 21, 0));
  for (const [i, a] of addresses.entries()) await addDelivery(db, shift.id, a, at(2026, 10, day, 21, 10 + i));
  await closeShift(db, shift.id, at(2026, 10, day + 1, 1, 0));
  return shift;
}

describe('settings', () => {
  it('starts with the default rate and saves a new one', async () => {
    expect(await getRate(db)).toBe(3000);
    await setRate(db, 3500);
    expect(await getRate(db)).toBe(3500);
  });

  it('rejects invalid rates', async () => {
    await expect(setRate(db, 0)).rejects.toThrow(UserError);
    await expect(setRate(db, 2.5)).rejects.toThrow(UserError);
  });
});

describe('shift lifecycle', () => {
  it('starts a shift with the current rate and keeps it when the rate changes', async () => {
    const shift = await startShift(db, at(2026, 11, 14, 21, 5));
    await setRate(db, 4000);
    expect(await getOpenShift(db)).toMatchObject({ id: shift.id, rate: 3000, endedAt: null, deliveryCount: 0 });
    const next = await (async () => {
      await addDelivery(db, shift.id, 'Belgrano 1450', at(2026, 11, 14, 21, 30));
      await closeShift(db, shift.id, at(2026, 11, 15, 1, 0));
      return startShift(db, at(2026, 11, 15, 21, 0));
    })();
    expect(next.rate).toBe(4000);
  });

  it('allows only one open shift', async () => {
    await startShift(db, at(2026, 11, 14, 21, 0));
    await expect(startShift(db, at(2026, 11, 14, 22, 0))).rejects.toThrow('Ya hay un turno abierto.');
  });

  it('cannot close a shift without deliveries, but can discard it', async () => {
    const shift = await startShift(db, at(2026, 11, 14, 21, 0));
    await expect(closeShift(db, shift.id, at(2026, 11, 14, 23, 0))).rejects.toThrow(UserError);
    await discardShift(db, shift.id);
    expect(await getOpenShift(db)).toBeNull();
  });

  it('does not discard a shift that has deliveries', async () => {
    const shift = await startShift(db, at(2026, 11, 14, 21, 0));
    await addDelivery(db, shift.id, 'Mitre 315', at(2026, 11, 14, 21, 10));
    await expect(discardShift(db, shift.id)).rejects.toThrow(UserError);
  });

  it('closes a shift and reports it as the last one', async () => {
    const shift = await startShift(db, at(2026, 11, 14, 21, 0));
    await addDelivery(db, shift.id, 'Mitre 315', at(2026, 11, 14, 21, 10));
    await addDelivery(db, shift.id, 'Mitre 315', at(2026, 11, 14, 21, 40));
    await closeShift(db, shift.id, at(2026, 11, 15, 1, 10));
    expect(await getOpenShift(db)).toBeNull();
    expect(await getLastClosedShift(db)).toMatchObject({
      id: shift.id,
      endedAt: at(2026, 11, 15, 1, 10),
      deliveryCount: 2,
    });
    await expect(closeShift(db, shift.id, at(2026, 11, 15, 2, 0))).rejects.toThrow(UserError);
  });

  it('never stores an end before the start', async () => {
    const shift = await startShift(db, at(2026, 11, 14, 21, 0));
    await addDelivery(db, shift.id, 'Mitre 315', at(2026, 11, 14, 21, 10));
    await closeShift(db, shift.id, at(2026, 11, 14, 20, 0));
    expect((await getShift(db, shift.id))?.endedAt).toBe(at(2026, 11, 14, 21, 0));
  });

  it('lists shifts most recent first with counts', async () => {
    await closedOctoberShift(3, ['A', 'B']);
    await closedOctoberShift(10, ['C']);
    const open = await startShift(db, at(2026, 11, 14, 21, 0));
    const list = await listShifts(db);
    expect(list.map((s) => [s.id, s.deliveryCount])).toEqual([
      [open.id, 0],
      [2, 1],
      [1, 2],
    ]);
  });
});

describe('deliveries', () => {
  it('adds trimmed addresses newest first and rejects blank ones', async () => {
    const shift = await startShift(db, at(2026, 11, 14, 21, 0));
    await addDelivery(db, shift.id, '  Mitre 315  ', at(2026, 11, 14, 21, 10));
    await addDelivery(db, shift.id, 'Belgrano 1450', at(2026, 11, 14, 21, 20));
    await addDelivery(db, shift.id, 'Mitre 315', at(2026, 11, 14, 21, 20)); // same minute: id breaks the tie
    await expect(addDelivery(db, shift.id, '   ', at(2026, 11, 14, 21, 30))).rejects.toThrow('Escribí una dirección.');
    expect((await listDeliveries(db, shift.id)).map((d) => d.address)).toEqual([
      'Mitre 315',
      'Belgrano 1450',
      'Mitre 315',
    ]);
  });

  it('only adds deliveries to the open shift', async () => {
    const closed = await closedOctoberShift(3, ['A']);
    await expect(addDelivery(db, closed.id, 'B', at(2026, 10, 4, 2, 0))).rejects.toThrow(UserError);
  });

  it('edits and deletes deliveries of a closed shift while its month is open', async () => {
    const shift = await closedOctoberShift(3, ['Mitre 315', 'Belgran 1450']);
    const [typo] = await listDeliveries(db, shift.id);
    await updateDeliveryAddress(db, typo.id, ' Belgrano 1450 ');
    expect((await listDeliveries(db, shift.id))[0].address).toBe('Belgrano 1450');
    await deleteDelivery(db, typo.id);
    expect(await listDeliveries(db, shift.id)).toHaveLength(1);
  });

  it('aggregates address usage for autocomplete', async () => {
    await closedOctoberShift(3, ['Mitre 315', 'Belgrano 1450', 'Mitre 315']);
    const usage = await getAddressUsage(db);
    expect(usage).toEqual(
      expect.arrayContaining([
        { address: 'Mitre 315', count: 2, lastUsedAt: at(2026, 10, 3, 21, 12) },
        { address: 'Belgrano 1450', count: 1, lastUsedAt: at(2026, 10, 3, 21, 11) },
      ]),
    );
  });
});

describe('closing months', () => {
  const NOV_10 = at(2026, 11, 10, 12, 0);

  it('closes a finished month and makes its shifts read-only until reopened', async () => {
    const shift = await closedOctoberShift(3, ['Mitre 315']);
    const [delivery] = await listDeliveries(db, shift.id);
    await closeMonth(db, OCT, NOV_10);
    expect(await listClosures(db)).toMatchObject([{ year: 2026, month: 10, closedAt: NOV_10 }]);

    await expect(updateDeliveryAddress(db, delivery.id, 'Otra 1')).rejects.toThrow(/mes está cerrado/);
    await expect(deleteDelivery(db, delivery.id)).rejects.toThrow(/mes está cerrado/);
    await expect(deleteShift(db, shift.id)).rejects.toThrow(/mes está cerrado/);

    await reopenMonth(db, OCT);
    await deleteShift(db, shift.id);
    expect(await getShift(db, shift.id)).toBeNull();
    expect(await listDeliveries(db, shift.id)).toEqual([]);
  });

  it('refuses the current month, empty months and months with an open shift', async () => {
    await closedOctoberShift(3, ['A']);
    await expect(closeMonth(db, { year: 2026, month: 11 }, NOV_10)).rejects.toThrow(/ya terminaron/);
    await expect(closeMonth(db, { year: 2026, month: 9 }, NOV_10)).rejects.toThrow(/no tiene turnos/);
    await startShift(db, at(2026, 10, 31, 21, 0)); // forgotten open shift from October
    await expect(closeMonth(db, OCT, NOV_10)).rejects.toThrow(/turno abierto/);
  });

  it('cannot close twice or reopen a month that is not closed', async () => {
    await closedOctoberShift(3, ['A']);
    await expect(reopenMonth(db, OCT)).rejects.toThrow(UserError);
    await closeMonth(db, OCT, NOV_10);
    await expect(closeMonth(db, OCT, NOV_10)).rejects.toThrow(/ya está cerrado/);
  });

  it('cannot delete the open shift (it must be closed or discarded)', async () => {
    const open = await startShift(db, at(2026, 11, 14, 21, 0));
    await expect(deleteShift(db, open.id)).rejects.toThrow(UserError);
  });
});

describe('backup', () => {
  it('exports everything and imports it into another database', async () => {
    await closedOctoberShift(3, ['Mitre 315', 'Belgrano 1450']);
    await closeMonth(db, OCT, at(2026, 11, 2));
    const open = await startShift(db, at(2026, 11, 14, 21, 0));
    await addDelivery(db, open.id, 'San Martín 820', at(2026, 11, 14, 21, 5));
    await setRate(db, 3500);

    const text = serializeBackup(buildBackup(await exportData(db), at(2026, 11, 14, 22, 0)));
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.error);

    const other = (await createMigratedTestDb()).db;
    await importData(other, parsed.backup.data);
    expect(await exportData(other)).toEqual(await exportData(db));
    expect(await getOpenShift(other)).toMatchObject({ id: open.id, deliveryCount: 1 });
  });

  it('replaces existing data and keeps working afterwards', async () => {
    await closedOctoberShift(3, ['A', 'B', 'C']);
    const data = {
      settings: { rate: 2800 },
      shifts: [{ id: 7, startedAt: at(2026, 9, 5, 21), endedAt: at(2026, 9, 6, 1), rate: 2800 }],
      deliveries: [{ id: 40, shiftId: 7, address: 'Rivadavia 1132', createdAt: at(2026, 9, 5, 21, 30) }],
      monthClosures: [],
    };
    await importData(db, data);
    expect(await exportData(db)).toEqual(data);

    // New rows get fresh ids after the imported ones.
    const shift = await startShift(db, at(2026, 11, 14, 21, 0));
    expect(shift.id).toBeGreaterThan(7);
    expect(shift.rate).toBe(2800);
  });

  it('leaves current data untouched when the import fails', async () => {
    await closedOctoberShift(3, ['A']);
    const before = await exportData(db);
    const broken = {
      settings: { rate: 3000 },
      shifts: [{ id: 1, startedAt: 1, endedAt: null, rate: 3000 }],
      deliveries: [{ id: 1, shiftId: 99, address: 'X', createdAt: 2 }], // unknown shift → FK error
      monthClosures: [],
    };
    await expect(importData(db, broken)).rejects.toThrow();
    expect(await exportData(db)).toEqual(before);
  });
});
