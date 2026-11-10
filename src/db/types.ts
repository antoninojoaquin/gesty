/**
 * The subset of expo-sqlite's `SQLiteDatabase` the app uses. Repositories depend on this
 * instead of the concrete class, so tests can run them against Node's built-in SQLite.
 */
export type SqlParam = string | number | null;

export type RunResult = { lastInsertRowId: number; changes: number };

export type Db = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParam[]): Promise<RunResult>;
  getFirstAsync<T>(source: string, params: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlParam[]): Promise<T[]>;
  /** Runs `task` in a transaction; inside it, use `txn` (never the outer `db`). Not reentrant. */
  withExclusiveTransactionAsync(task: (txn: Db) => Promise<void>): Promise<void>;
};

/**
 * An expected failure caused by the user's action (e.g. closing a shift with no deliveries).
 * `message` is in Spanish and can be shown as is.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}
