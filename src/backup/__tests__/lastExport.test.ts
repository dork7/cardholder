import { makeStore } from '../../../test/fixtures';
import { createSettings } from '../../storage/settings';
import { recordExport } from '../lastExport';

test('recordExport keeps the time of the last backup', async () => {
  const { db } = await makeStore();
  const settings = createSettings(db);
  expect(await settings.getNumber('lastExportAt')).toBeNull();
  await recordExport(settings, 10_000_000_000);
  expect(await settings.getNumber('lastExportAt')).toBe(10_000_000_000);
});
