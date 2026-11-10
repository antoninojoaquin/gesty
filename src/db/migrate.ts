import { migrations as defaultMigrations, type Migration } from './migrations';

/** The subset of expo-sqlite's SQLiteDatabase the migrator needs (easy to fake in tests). */
export type MigratableDb = {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
  withExclusiveTransactionAsync(task: (txn: MigratableDb) => Promise<void>): Promise<void>;
};

/** Throws if versions are not 1, 2, 3… in order. */
export function assertValidMigrations(list: readonly Migration[]): void {
  list.forEach((m, i) => {
    if (m.version !== i + 1) {
      throw new Error(`Migration at index ${i} has version ${m.version}, expected ${i + 1}`);
    }
  });
}

export async function getSchemaVersion(db: MigratableDb): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Applies every pending migration, each one in its own transaction together with the
 * `user_version` bump, so a failed migration leaves the database at the previous version.
 * Returns the resulting schema version.
 */
export async function migrate(db: MigratableDb, list: readonly Migration[] = defaultMigrations): Promise<number> {
  assertValidMigrations(list);

  const current = await getSchemaVersion(db);
  const latest = list.length;

  if (current > latest) {
    // The database was written by a newer app version (e.g. an OTA update was rolled back).
    throw new Error(`Database schema version ${current} is newer than this app supports (${latest})`);
  }

  for (const migration of list.slice(current)) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(migration.sql);
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return latest;
}
