import { assertValidMigrations, getSchemaVersion, migrate } from '../migrate';
import { DEFAULT_RATE, migrations, type Migration } from '../migrations';
import { createTestDb } from '../testing';

describe('migrations list', () => {
  it('has consecutive versions starting at 1', () => {
    expect(() => assertValidMigrations(migrations)).not.toThrow();
  });

  it('rejects gaps or wrong order', () => {
    const bad: Migration[] = [
      { version: 1, description: '', sql: '' },
      { version: 3, description: '', sql: '' },
    ];
    expect(() => assertValidMigrations(bad)).toThrow(/expected 2/);
  });
});

describe('migrate', () => {
  it('migrates an empty database to the latest version', async () => {
    const { db } = createTestDb();
    await expect(migrate(db)).resolves.toBe(migrations.length);
    await expect(getSchemaVersion(db)).resolves.toBe(migrations.length);
  });

  it('is a no-op when already up to date', async () => {
    const { db } = createTestDb();
    await migrate(db);
    await expect(migrate(db)).resolves.toBe(migrations.length);
  });

  it('only runs pending migrations', async () => {
    const { db, raw } = createTestDb();
    const v1: Migration = { version: 1, description: '', sql: 'CREATE TABLE a (x INTEGER);' };
    const v2: Migration = { version: 2, description: '', sql: 'CREATE TABLE b (x INTEGER);' };
    await migrate(db, [v1]);
    await migrate(db, [v1, v2]);
    const tables = raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    expect(tables.map((t) => t.name)).toEqual(['a', 'b']);
  });

  it('rolls back a failing migration and keeps the previous version', async () => {
    const { db, raw } = createTestDb();
    const v1: Migration = { version: 1, description: '', sql: 'CREATE TABLE a (x INTEGER);' };
    const broken: Migration = { version: 2, description: '', sql: 'CREATE TABLE b (x INTEGER); NOT VALID SQL;' };
    await migrate(db, [v1]);
    await expect(migrate(db, [v1, broken])).rejects.toThrow();
    await expect(getSchemaVersion(db)).resolves.toBe(1);
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE name = 'b'").get()).toBeUndefined();
  });

  it('refuses a database newer than the app', async () => {
    const { db, raw } = createTestDb();
    raw.exec(`PRAGMA user_version = ${migrations.length + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer/);
  });
});

describe('initial schema', () => {
  async function migrated() {
    const { db, raw } = createTestDb();
    await migrate(db);
    return raw;
  }

  it('seeds the default rate', async () => {
    const raw = await migrated();
    expect(raw.prepare("SELECT value FROM settings WHERE key = 'rate'").get()).toEqual({
      value: String(DEFAULT_RATE),
    });
  });

  it('allows only one open shift at a time', async () => {
    const raw = await migrated();
    const insert = raw.prepare('INSERT INTO shifts (started_at, ended_at, rate) VALUES (?, ?, 3000)');
    insert.run(1000, 2000);
    insert.run(3000, 4000);
    insert.run(5000, null);
    expect(() => insert.run(6000, null)).toThrow(/UNIQUE/);
  });

  it('rejects a non-positive rate and an end before the start', async () => {
    const raw = await migrated();
    expect(() => raw.exec('INSERT INTO shifts (started_at, rate) VALUES (1, 0)')).toThrow(/CHECK/);
    expect(() => raw.exec('INSERT INTO shifts (started_at, ended_at, rate) VALUES (10, 5, 3000)')).toThrow(/CHECK/);
  });

  it('rejects blank addresses and deletes deliveries with their shift', async () => {
    const raw = await migrated();
    raw.exec('INSERT INTO shifts (id, started_at, rate) VALUES (1, 1, 3000)');
    expect(() => raw.exec("INSERT INTO deliveries (shift_id, address, created_at) VALUES (1, '   ', 2)")).toThrow(
      /CHECK/,
    );
    raw.exec("INSERT INTO deliveries (shift_id, address, created_at) VALUES (1, 'Belgrano 1450', 2)");
    raw.exec('DELETE FROM shifts WHERE id = 1');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM deliveries').get()).toEqual({ n: 0 });
  });

  it('allows a single closure per month', async () => {
    const raw = await migrated();
    raw.exec('INSERT INTO month_closures (year, month, closed_at) VALUES (2026, 10, 1)');
    expect(() => raw.exec('INSERT INTO month_closures (year, month, closed_at) VALUES (2026, 10, 2)')).toThrow(
      /UNIQUE/,
    );
    expect(() => raw.exec('INSERT INTO month_closures (year, month, closed_at) VALUES (2026, 13, 2)')).toThrow(
      /CHECK/,
    );
  });
});
