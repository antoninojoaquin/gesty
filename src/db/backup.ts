import type { BackupData } from '@/logic/backup';
import type { Delivery, Shift } from '@/logic/types';

import { listClosures } from './months';
import { getRate, setRate } from './settings';
import type { Db } from './types';

/** Everything the user has, for "Exportar datos". */
export async function exportData(db: Db): Promise<BackupData> {
  const [rate, shifts, deliveries, monthClosures] = await Promise.all([
    getRate(db),
    db.getAllAsync<Shift>('SELECT id, started_at AS startedAt, ended_at AS endedAt, rate FROM shifts ORDER BY id', []),
    db.getAllAsync<Delivery>(
      'SELECT id, shift_id AS shiftId, address, created_at AS createdAt FROM deliveries ORDER BY id',
      [],
    ),
    listClosures(db),
  ]);
  return { settings: { rate }, shifts, deliveries, monthClosures };
}

/**
 * "Importar datos": REPLACES all current data with an already validated backup
 * (see `parseBackup`). All or nothing: on any error the current data stays untouched.
 */
export async function importData(db: Db, data: BackupData): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM deliveries; DELETE FROM shifts; DELETE FROM month_closures;');
    for (const s of data.shifts) {
      await txn.runAsync('INSERT INTO shifts (id, started_at, ended_at, rate) VALUES (?, ?, ?, ?)', [
        s.id,
        s.startedAt,
        s.endedAt,
        s.rate,
      ]);
    }
    for (const d of data.deliveries) {
      await txn.runAsync('INSERT INTO deliveries (id, shift_id, address, created_at) VALUES (?, ?, ?, ?)', [
        d.id,
        d.shiftId,
        d.address,
        d.createdAt,
      ]);
    }
    for (const c of data.monthClosures) {
      await txn.runAsync('INSERT INTO month_closures (id, year, month, closed_at) VALUES (?, ?, ?, ?)', [
        c.id,
        c.year,
        c.month,
        c.closedAt,
      ]);
    }
    await setRate(txn, data.settings.rate);

    // expo-sqlite runs exclusive transactions on a NEW connection, where foreign keys are not
    // enforced (the pragma is per connection). Check them explicitly before committing.
    const broken = await txn.getAllAsync<unknown>('PRAGMA foreign_key_check', []);
    if (broken.length > 0) throw new Error('Backup data has broken references');
  });
}
