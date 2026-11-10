/** Backup file format for "Exportar datos" / "Importar datos" (SPEC §4.6). */
import { isValidRate } from './money';
import type { Delivery, MonthClosure, Shift } from './types';

export const BACKUP_APP_ID = 'gesty';
export const BACKUP_FORMAT_VERSION = 1;

export type BackupData = {
  settings: { rate: number };
  shifts: Shift[];
  deliveries: Delivery[];
  monthClosures: MonthClosure[];
};

export type Backup = {
  app: typeof BACKUP_APP_ID;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: number;
  data: BackupData;
};

export function buildBackup(data: BackupData, now: number): Backup {
  return { app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now, data };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** `"gesty-respaldo-2026-11-10.json"` (local date). */
export function backupFileName(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `gesty-respaldo-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** True for files written by `backupFileName` (used to clean old exports from the cache). */
export function isBackupFileName(name: string): boolean {
  return /^gesty-respaldo-\d{4}-\d{2}-\d{2}\.json$/.test(name);
}

export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; error: string };

const NOT_A_BACKUP = 'El archivo no es un respaldo de Gesty.';
const DAMAGED = 'El respaldo está dañado o incompleto.';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const isTimestamp = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function parseShift(v: unknown): Shift | null {
  if (!isObject(v)) return null;
  const { id, startedAt, endedAt, rate } = v;
  if (!isId(id) || !isTimestamp(startedAt) || typeof rate !== 'number' || !isValidRate(rate)) return null;
  if (endedAt !== null && !(isTimestamp(endedAt) && endedAt >= startedAt)) return null;
  return { id, startedAt, endedAt, rate };
}

function parseDelivery(v: unknown): Delivery | null {
  if (!isObject(v)) return null;
  const { id, shiftId, address, createdAt } = v;
  if (!isId(id) || !isId(shiftId) || !isTimestamp(createdAt)) return null;
  if (typeof address !== 'string' || address.trim() === '') return null;
  return { id, shiftId, address: address.trim(), createdAt };
}

function parseClosure(v: unknown): MonthClosure | null {
  if (!isObject(v)) return null;
  const { id, year, month, closedAt } = v;
  if (!isId(id) || !Number.isSafeInteger(year) || !isTimestamp(closedAt)) return null;
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) return null;
  return { id, year: year as number, month: month as number, closedAt };
}

function parseList<T>(v: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const item of v) {
    const parsed = parse(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

const hasDuplicates = (values: readonly (string | number)[]) => new Set(values).size !== values.length;

/** Validates an exported file before importing it (import REPLACES all data). */
export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!isObject(json) || json.app !== BACKUP_APP_ID) return { ok: false, error: NOT_A_BACKUP };
  if (typeof json.formatVersion !== 'number' || json.formatVersion > BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'Este respaldo es de una versión más nueva de Gesty. Actualizá la app y probá de nuevo.' };
  }
  if (json.formatVersion !== BACKUP_FORMAT_VERSION || !isTimestamp(json.exportedAt) || !isObject(json.data)) {
    return { ok: false, error: DAMAGED };
  }

  const { settings, shifts: rawShifts, deliveries: rawDeliveries, monthClosures: rawClosures } = json.data;
  if (!isObject(settings) || typeof settings.rate !== 'number' || !isValidRate(settings.rate)) {
    return { ok: false, error: DAMAGED };
  }
  const shifts = parseList(rawShifts, parseShift);
  const deliveries = parseList(rawDeliveries, parseDelivery);
  const monthClosures = parseList(rawClosures, parseClosure);
  if (!shifts || !deliveries || !monthClosures) return { ok: false, error: DAMAGED };

  const shiftIds = new Set(shifts.map((s) => s.id));
  const consistent =
    !hasDuplicates(shifts.map((s) => s.id)) &&
    !hasDuplicates(deliveries.map((d) => d.id)) &&
    !hasDuplicates(monthClosures.map((c) => c.id)) &&
    !hasDuplicates(monthClosures.map((c) => `${c.year}-${c.month}`)) &&
    shifts.filter((s) => s.endedAt === null).length <= 1 &&
    deliveries.every((d) => shiftIds.has(d.shiftId));
  if (!consistent) return { ok: false, error: DAMAGED };

  return {
    ok: true,
    backup: {
      app: BACKUP_APP_ID,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: json.exportedAt,
      data: { settings: { rate: settings.rate }, shifts, deliveries, monthClosures },
    },
  };
}

/** "Este respaldo tiene 12 turnos. Importarlo reemplaza todos los datos actuales." */
export function importConfirmationMessage(backup: Backup): string {
  const n = backup.data.shifts.length;
  const turnos = n === 1 ? '1 turno' : `${n} turnos`;
  return `Este respaldo tiene ${turnos}. Importarlo reemplaza todos los datos actuales. ¿Seguís?`;
}
