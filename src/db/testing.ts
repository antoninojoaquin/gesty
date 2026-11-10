/**
 * Test-only: runs the app's data layer against Node's built-in SQLite (node:sqlite),
 * wrapped with the same async API as expo-sqlite. Never imported by the app.
 */
import { DatabaseSync } from 'node:sqlite';

import { migrate } from './migrate';
import type { Db, SqlParam } from './types';

export function createTestDb(): { db: Db; raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  let inTransaction = false;

  const db: Db = {
    execAsync: async (sql) => {
      raw.exec(sql);
    },
    runAsync: async (sql, params: SqlParam[]) => {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    getFirstAsync: async <T,>(sql: string, params: SqlParam[]) =>
      (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllAsync: async <T,>(sql: string, params: SqlParam[]) => raw.prepare(sql).all(...params) as T[],
    withExclusiveTransactionAsync: async (task) => {
      // Like expo-sqlite, transactions are not reentrant: catch accidental nesting in tests.
      if (inTransaction) throw new Error('Nested transaction');
      inTransaction = true;
      raw.exec('BEGIN EXCLUSIVE');
      try {
        await task(db);
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        inTransaction = false;
      }
    },
  };
  return { db, raw };
}

/** A fresh in-memory database with every migration applied. */
export async function createMigratedTestDb(): Promise<{ db: Db; raw: DatabaseSync }> {
  const test = createTestDb();
  await migrate(test.db);
  return test;
}
