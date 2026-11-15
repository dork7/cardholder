import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { loadWarnIdShare, saveWarnIdShare } from '../idWarning';

test('the ID warning is on until turned off, and the choice is remembered', async () => {
  const db = memoryDb();
  await migrate(db);
  const settings = createSettings(db);
  expect(await loadWarnIdShare(settings)).toBe(true);
  await saveWarnIdShare(settings, false);
  expect(await loadWarnIdShare(settings)).toBe(false);
  await saveWarnIdShare(settings, true);
  expect(await loadWarnIdShare(settings)).toBe(true);
});
