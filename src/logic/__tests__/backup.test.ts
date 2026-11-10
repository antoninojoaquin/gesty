import {
  backupFileName,
  buildBackup,
  importConfirmationMessage,
  isBackupFileName,
  parseBackup,
  serializeBackup,
  type BackupData,
} from '../backup';
import { at } from '../testing';

const data: BackupData = {
  settings: { rate: 3500 },
  shifts: [
    { id: 1, startedAt: at(2026, 10, 3, 21), endedAt: at(2026, 10, 4, 1), rate: 3000 },
    { id: 2, startedAt: at(2026, 11, 10, 21), endedAt: null, rate: 3500 },
  ],
  deliveries: [
    { id: 1, shiftId: 1, address: 'Belgrano 1450', createdAt: at(2026, 10, 3, 21, 30) },
    { id: 2, shiftId: 2, address: 'Mitre 315', createdAt: at(2026, 11, 10, 21, 30) },
  ],
  monthClosures: [{ id: 1, year: 2026, month: 10, closedAt: at(2026, 11, 2) }],
};

const NOW = at(2026, 11, 10, 22, 0);
const valid = () => JSON.parse(serializeBackup(buildBackup(data, NOW)));
const parse = (obj: unknown) => parseBackup(JSON.stringify(obj));

describe('backup round trip', () => {
  it('parses what it exports', () => {
    expect(parseBackup(serializeBackup(buildBackup(data, NOW)))).toEqual({ ok: true, backup: buildBackup(data, NOW) });
  });

  it('names the file with the local date', () => {
    expect(backupFileName(at(2026, 1, 5, 23, 59))).toBe('gesty-respaldo-2026-01-05.json');
  });

  it('builds the import confirmation', () => {
    expect(importConfirmationMessage(buildBackup(data, NOW))).toBe(
      'Este respaldo tiene 2 turnos. Importarlo reemplaza todos los datos actuales. ¿Seguís?',
    );
    expect(importConfirmationMessage(buildBackup({ ...data, shifts: [data.shifts[0]], deliveries: [data.deliveries[0]] }, NOW))).toContain(
      'tiene 1 turno.',
    );
  });

  it('trims addresses on import', () => {
    const b = valid();
    b.data.deliveries[0].address = '  Belgrano 1450 ';
    const result = parse(b);
    expect(result.ok && result.backup.data.deliveries[0].address).toBe('Belgrano 1450');
  });
});

describe('parseBackup rejects', () => {
  it.each(['', 'not json', '[]', '{"app":"otra"}'])('files that are not a Gesty backup: %p', (text) => {
    expect(parseBackup(text)).toEqual({ ok: false, error: 'El archivo no es un respaldo de Gesty.' });
  });

  it('backups from a newer format', () => {
    const result = parse({ ...valid(), formatVersion: 2 });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/versión más nueva/);
  });

  const damaged: [string, (b: any) => void][] = [
    ['missing data', (b) => delete b.data],
    ['zero rate', (b) => (b.data.settings.rate = 0)],
    ['float rate in a shift', (b) => (b.data.shifts[0].rate = 3000.5)],
    ['end before start', (b) => (b.data.shifts[0].endedAt = b.data.shifts[0].startedAt - 1)],
    ['blank address', (b) => (b.data.deliveries[0].address = '  ')],
    ['delivery of an unknown shift', (b) => (b.data.deliveries[0].shiftId = 99)],
    ['duplicate shift ids', (b) => (b.data.shifts[1].id = 1)],
    ['two open shifts', (b) => (b.data.shifts[0].endedAt = null)],
    ['invalid month', (b) => (b.data.monthClosures[0].month = 13)],
    ['duplicate month closure', (b) => b.data.monthClosures.push({ ...b.data.monthClosures[0], id: 2 })],
    ['shifts not a list', (b) => (b.data.shifts = {})],
  ];

  it.each(damaged)('damaged data: %s', (_, mutate) => {
    const b = valid();
    mutate(b);
    expect(parse(b)).toEqual({ ok: false, error: 'El respaldo está dañado o incompleto.' });
  });
});

describe('isBackupFileName', () => {
  it('recognizes exported backup files only', () => {
    expect(isBackupFileName(backupFileName(at(2026, 11, 10)))).toBe(true);
    expect(isBackupFileName('gesty-respaldo-2026-11-10 (1).json')).toBe(false);
    expect(isBackupFileName('otra-cosa.json')).toBe(false);
    expect(isBackupFileName('gesty.db')).toBe(false);
  });
});
