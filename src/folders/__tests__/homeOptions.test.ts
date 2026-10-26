import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { loadHomeFolders, saveHomeFolders } from '../homeOptions';

async function setup() {
  const db = memoryDb();
  await migrate(db);
  return createSettings(db);
}

test('both folder options start on', async () => {
  expect(await loadHomeFolders(await setup())).toEqual({ filter: true, manage: true });
});

test('a saved choice is read back', async () => {
  const settings = await setup();
  await saveHomeFolders(settings, { filter: false, manage: true });
  expect(await loadHomeFolders(settings)).toEqual({ filter: false, manage: true });
  await saveHomeFolders(settings, { filter: true, manage: false });
  expect(await loadHomeFolders(settings)).toEqual({ filter: true, manage: false });
});
