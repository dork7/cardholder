import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { loadStackVertical, saveStackVertical } from '../stackDirection';

test('sideways until switched, and remembered', async () => {
  const db = memoryDb();
  await migrate(db);
  const settings = createSettings(db);
  expect(await loadStackVertical(settings)).toBe(false);
  await saveStackVertical(settings, true);
  expect(await loadStackVertical(settings)).toBe(true);
  await saveStackVertical(settings, false);
  expect(await loadStackVertical(settings)).toBe(false);
});
