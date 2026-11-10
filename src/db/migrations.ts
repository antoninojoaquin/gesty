/**
 * Versioned database migrations.
 *
 * RULES (see CLAUDE.md):
 * - Never edit or reorder an existing migration once it has been released.
 *   Every schema change is a NEW migration appended at the end.
 * - Versions are consecutive, starting at 1.
 *
 * Dates are stored as INTEGER Unix timestamps in milliseconds (UTC).
 * Day/month assignment happens in local time, in the business logic.
 * Money is stored as INTEGER pesos.
 */
export type Migration = {
  version: number;
  description: string;
  sql: string;
};

export const DEFAULT_RATE = 3000;

export const migrations: readonly Migration[] = [
  {
    version: 1,
    description: 'Initial schema: shifts, deliveries, month closures and settings',
    sql: `
      CREATE TABLE shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        rate INTEGER NOT NULL CHECK (rate > 0),
        CHECK (ended_at IS NULL OR ended_at >= started_at)
      );

      -- Only one open shift at a time (business rule 2).
      CREATE UNIQUE INDEX idx_shifts_single_open ON shifts ((ended_at IS NULL)) WHERE ended_at IS NULL;
      CREATE INDEX idx_shifts_started_at ON shifts (started_at);

      CREATE TABLE deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
        address TEXT NOT NULL CHECK (length(trim(address)) > 0),
        created_at INTEGER NOT NULL
      );

      CREATE INDEX idx_deliveries_shift_id ON deliveries (shift_id);

      CREATE TABLE month_closures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
        closed_at INTEGER NOT NULL,
        UNIQUE (year, month)
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      INSERT INTO settings (key, value) VALUES ('rate', '${DEFAULT_RATE}');
    `,
  },
];
