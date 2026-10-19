import Database from 'better-sqlite3';
import { SqlDb, SqlValue } from '../src/storage/sqlDb';

// better-sqlite3 only binds Buffers for BLOBs, not plain Uint8Arrays.
const bind = (params: SqlValue[]) =>
  params.map((p) => (p instanceof Uint8Array && !Buffer.isBuffer(p) ? Buffer.from(p) : p));

export function memoryDb(): SqlDb {
  const db = new Database(':memory:');
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params) {
      return db.prepare(sql).run(...bind(params));
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      return db.prepare(sql).all(...bind(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      return (db.prepare(sql).get(...bind(params)) as T | undefined) ?? null;
    },
    async withTransactionAsync(fn) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
