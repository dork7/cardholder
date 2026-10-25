import { memoryDb } from '../../../test/memoryDb';
import { LOCK_AFTER_BACKGROUND_MS } from '../../config';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { loadAppLock, lockOnReturn, saveAppLock } from '../appLock';

test('off until turned on, and remembered', async () => {
  const db = memoryDb();
  await migrate(db);
  const settings = createSettings(db);
  expect(await loadAppLock(settings)).toBe(false);
  await saveAppLock(settings, true);
  expect(await loadAppLock(settings)).toBe(true);
  await saveAppLock(settings, false);
  expect(await loadAppLock(settings)).toBe(false);
});

test('a short trip out does not lock; a long one does', () => {
  expect(lockOnReturn(null, 1_000_000)).toBe(false);
  expect(lockOnReturn(1_000_000, 1_000_000 + LOCK_AFTER_BACKGROUND_MS - 1)).toBe(false);
  expect(lockOnReturn(1_000_000, 1_000_000 + LOCK_AFTER_BACKGROUND_MS)).toBe(true);
});
