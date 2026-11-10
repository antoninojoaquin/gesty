import { canCloseMonth, isMonthClosed } from '@/logic/months';
import type { MonthClosure, MonthKey, Shift } from '@/logic/types';

import { UserError, type Db } from './types';

export async function listClosures(db: Db): Promise<MonthClosure[]> {
  return db.getAllAsync<MonthClosure>(
    'SELECT id, year, month, closed_at AS closedAt FROM month_closures ORDER BY year DESC, month DESC',
    [],
  );
}

/** Rule 9: validates with `canCloseMonth` and records the closure. */
export async function closeMonth(db: Db, key: MonthKey, now: number): Promise<void> {
  const shifts = await db.getAllAsync<Shift>(
    'SELECT id, started_at AS startedAt, ended_at AS endedAt, rate FROM shifts',
    [],
  );
  const check = canCloseMonth(key, shifts, await listClosures(db), now);
  if (!check.ok) throw new UserError(check.message);
  await db.runAsync('INSERT INTO month_closures (year, month, closed_at) VALUES (?, ?, ?)', [
    key.year,
    key.month,
    now,
  ]);
}

/** Reopens a closed month so its shifts can be edited again. */
export async function reopenMonth(db: Db, key: MonthKey): Promise<void> {
  if (!isMonthClosed(key, await listClosures(db))) throw new UserError('Este mes no está cerrado.');
  await db.runAsync('DELETE FROM month_closures WHERE year = ? AND month = ?', [key.year, key.month]);
}
