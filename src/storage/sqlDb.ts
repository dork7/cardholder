export type SqlValue = string | number | null | Uint8Array;

// Matches the parts of expo-sqlite's SQLiteDatabase we use, so tests can swap in better-sqlite3.
export interface SqlDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

// Append only. Index i upgrades the schema from user_version i to i + 1.
const MIGRATIONS = [
  `CREATE TABLE cards (
     id TEXT PRIMARY KEY NOT NULL,
     pinned INTEGER NOT NULL,
     position INTEGER NOT NULL,
     payload BLOB NOT NULL,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE settings (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

export async function migrate(db: SqlDb): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version++) {
    // Schema change and version bump commit together, so a crash never leaves tables without the matching user_version.
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
