import { SqlDb } from './sqlDb';

export type SettingKey = 'keyCheck' | 'unlocked' | 'lastExportAt' | 'backupSnoozedUntil' | 'appearance';

export interface Settings {
  get(key: SettingKey): Promise<string | null>;
  getNumber(key: SettingKey): Promise<number | null>;
  set(key: SettingKey, value: string): Promise<void>;
  remove(key: SettingKey): Promise<void>;
}

export function createSettings(db: SqlDb): Settings {
  const get = async (key: SettingKey) =>
    (await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]))?.value ?? null;
  return {
    get,
    async getNumber(key) {
      const value = await get(key);
      if (value === null) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    },
    async set(key, value) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value],
      );
    },
    async remove(key) {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    },
  };
}
