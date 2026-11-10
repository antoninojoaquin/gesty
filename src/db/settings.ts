import { isValidRate } from '@/logic/money';

import { DEFAULT_RATE } from './migrations';
import { UserError, type Db } from './types';

export async function getRate(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'rate'", []);
  const rate = row ? Number(row.value) : NaN;
  return isValidRate(rate) ? rate : DEFAULT_RATE;
}

/** Only affects shifts started afterwards (rule 10): open shifts keep their own rate. */
export async function setRate(db: Db, rate: number): Promise<void> {
  if (!isValidRate(rate)) throw new UserError('La tarifa tiene que ser un número entero mayor que 0.');
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES ('rate', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [String(rate)],
  );
}
