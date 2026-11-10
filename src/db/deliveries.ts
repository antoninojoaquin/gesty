import { normalizeAddress } from '@/logic/shifts';
import type { AddressUsage } from '@/logic/suggestions';
import type { Delivery } from '@/logic/types';

import { assertShiftEditable, getShift } from './shifts';
import { UserError, type Db } from './types';

const DELIVERY = 'SELECT id, shift_id AS shiftId, address, created_at AS createdAt FROM deliveries';

/** Deliveries of a shift, newest first. */
export async function listDeliveries(db: Db, shiftId: number): Promise<Delivery[]> {
  return db.getAllAsync<Delivery>(`${DELIVERY} WHERE shift_id = ? ORDER BY created_at DESC, id DESC`, [shiftId]);
}

function requireAddress(input: string): string {
  const address = normalizeAddress(input);
  if (address === null) throw new UserError('Escribí una dirección.');
  return address;
}

/** Adds a delivery to the OPEN shift. Repeated addresses are allowed (rule 6). */
export async function addDelivery(db: Db, shiftId: number, input: string, now: number): Promise<Delivery> {
  const address = requireAddress(input);
  const shift = await getShift(db, shiftId);
  if (!shift || shift.endedAt !== null) throw new UserError('Solo se pueden agregar envíos al turno abierto.');
  const { lastInsertRowId } = await db.runAsync(
    'INSERT INTO deliveries (shift_id, address, created_at) VALUES (?, ?, ?)',
    [shiftId, address, now],
  );
  return { id: lastInsertRowId, shiftId, address, createdAt: now };
}

async function requireEditableDelivery(db: Db, id: number): Promise<Delivery> {
  const delivery = await db.getFirstAsync<Delivery>(`${DELIVERY} WHERE id = ?`, [id]);
  if (!delivery) throw new UserError('El envío ya no existe.');
  const shift = await getShift(db, delivery.shiftId);
  if (shift) await assertShiftEditable(db, shift);
  return delivery;
}

/** Rule 5: editable in the open shift and in closed shifts of months not closed. */
export async function updateDeliveryAddress(db: Db, id: number, input: string): Promise<void> {
  const address = requireAddress(input);
  await requireEditableDelivery(db, id);
  await db.runAsync('UPDATE deliveries SET address = ? WHERE id = ?', [address, id]);
}

export async function deleteDelivery(db: Db, id: number): Promise<void> {
  await requireEditableDelivery(db, id);
  await db.runAsync('DELETE FROM deliveries WHERE id = ?', [id]);
}

/** One row per distinct address ever used, for autocomplete. */
export async function getAddressUsage(db: Db): Promise<AddressUsage[]> {
  return db.getAllAsync<AddressUsage>(
    'SELECT address, COUNT(*) AS count, MAX(created_at) AS lastUsedAt FROM deliveries GROUP BY address',
    [],
  );
}
