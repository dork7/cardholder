import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { loadCardBrightness, saveCardBrightness } from '../cardBrightness';

test('on until turned off, and remembered', async () => {
  const db = memoryDb();
  await migrate(db);
  const settings = createSettings(db);
  expect(await loadCardBrightness(settings)).toBe(true);
  await saveCardBrightness(settings, false);
  expect(await loadCardBrightness(settings)).toBe(false);
  await saveCardBrightness(settings, true);
  expect(await loadCardBrightness(settings)).toBe(true);
});
