import * as SQLite from 'expo-sqlite';
import { SqlDb, SqlValue } from './sqlDb';

export async function openDatabase(): Promise<SqlDb> {
  const db = await SQLite.openDatabaseAsync('cardholder.db');
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params) => db.runAsync(sql, params),
    getAllAsync: <T,>(sql: string, params: SqlValue[]) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T,>(sql: string, params: SqlValue[]) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (fn) => db.withTransactionAsync(fn),
  };
}
