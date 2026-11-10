import { isShiftReadOnly } from '@/logic/months';
import { canCloseShift } from '@/logic/shifts';
import type { Shift, ShiftWithCount } from '@/logic/types';

import { listClosures } from './months';
import { getRate } from './settings';
import { UserError, type Db } from './types';

const SHIFT_WITH_COUNT = `
  SELECT s.id, s.started_at AS startedAt, s.ended_at AS endedAt, s.rate,
         COUNT(d.id) AS deliveryCount
  FROM shifts s
  LEFT JOIN deliveries d ON d.shift_id = s.id
`;

export async function getShift(db: Db, id: number): Promise<ShiftWithCount | null> {
  return db.getFirstAsync<ShiftWithCount>(`${SHIFT_WITH_COUNT} WHERE s.id = ? GROUP BY s.id`, [id]);
}

export async function getOpenShift(db: Db): Promise<ShiftWithCount | null> {
  return db.getFirstAsync<ShiftWithCount>(`${SHIFT_WITH_COUNT} WHERE s.ended_at IS NULL GROUP BY s.id`, []);
}

/** Most recent closed shift, for the home screen's "Último turno" card. */
export async function getLastClosedShift(db: Db): Promise<ShiftWithCount | null> {
  return db.getFirstAsync<ShiftWithCount>(
    `${SHIFT_WITH_COUNT} WHERE s.ended_at IS NOT NULL GROUP BY s.id ORDER BY s.started_at DESC LIMIT 1`,
    [],
  );
}

/** Every shift (open and closed) with its delivery count, most recent first. */
export async function listShifts(db: Db): Promise<ShiftWithCount[]> {
  return db.getAllAsync<ShiftWithCount>(`${SHIFT_WITH_COUNT} GROUP BY s.id ORDER BY s.started_at DESC`, []);
}

async function requireShift(db: Db, id: number): Promise<ShiftWithCount> {
  const shift = await getShift(db, id);
  if (!shift) throw new UserError('El turno ya no existe.');
  return shift;
}

/** Throws if the shift belongs to a closed month (rule 9). */
export async function assertShiftEditable(db: Db, shift: Shift): Promise<void> {
  if (isShiftReadOnly(shift, await listClosures(db))) {
    throw new UserError('Este mes está cerrado. Reabrilo desde el historial para hacer cambios.');
  }
}

/** Starts a shift copying the current rate from settings (rule 2: only one open at a time). */
export async function startShift(db: Db, now: number): Promise<ShiftWithCount> {
  if (await getOpenShift(db)) throw new UserError('Ya hay un turno abierto.');
  const rate = await getRate(db);
  const { lastInsertRowId } = await db.runAsync('INSERT INTO shifts (started_at, ended_at, rate) VALUES (?, NULL, ?)', [
    now,
    rate,
  ]);
  return { id: lastInsertRowId, startedAt: now, endedAt: null, rate, deliveryCount: 0 };
}

/** Closes the open shift. Rule 7: it needs at least one delivery. */
export async function closeShift(db: Db, id: number, endedAt: number): Promise<void> {
  const shift = await requireShift(db, id);
  if (shift.endedAt !== null) throw new UserError('El turno ya estaba cerrado.');
  if (!canCloseShift(shift.deliveryCount)) {
    throw new UserError('No se puede cerrar un turno sin envíos. Podés descartarlo.');
  }
  await db.runAsync('UPDATE shifts SET ended_at = ? WHERE id = ?', [Math.max(endedAt, shift.startedAt), id]);
}

/** Discards the open shift. Only allowed when it has no deliveries (rule 7). */
export async function discardShift(db: Db, id: number): Promise<void> {
  const shift = await requireShift(db, id);
  if (shift.endedAt !== null) throw new UserError('Solo se puede descartar el turno abierto.');
  if (shift.deliveryCount > 0) throw new UserError('El turno tiene envíos: cerralo en lugar de descartarlo.');
  await db.runAsync('DELETE FROM shifts WHERE id = ?', [id]);
}

/** Deletes a closed shift and its deliveries, while its month is not closed. */
export async function deleteShift(db: Db, id: number): Promise<void> {
  const shift = await requireShift(db, id);
  if (shift.endedAt === null) throw new UserError('El turno está abierto: cerralo o descartalo.');
  await assertShiftEditable(db, shift);
  await db.runAsync('DELETE FROM shifts WHERE id = ?', [id]);
}
