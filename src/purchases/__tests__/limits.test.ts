import { memoryDb } from '../../../test/memoryDb';
import { createSettings } from '../../storage/settings';
import { migrate } from '../../storage/sqlDb';
import { isUnlocked, markUnlocked } from '../entitlement';
import { canAddCard } from '../limits';

test('free users can add until they have 4 cards', () => {
  expect(canAddCard(0, false, true)).toBe(true);
  expect(canAddCard(3, false, true)).toBe(true);
  expect(canAddCard(4, false, true)).toBe(false);
  expect(canAddCard(9, false, true)).toBe(false); // over the limit after an import: still blocked from adding
});

test('unlocked users can always add', () => {
  expect(canAddCard(500, true, true)).toBe(true);
});

test('with the limit switched off, anyone can add', () => {
  expect(canAddCard(500, false, false)).toBe(true);
});

test('unlock flag defaults to locked and persists', async () => {
  const db = memoryDb();
  await migrate(db);
  const settings = createSettings(db);
  expect(await isUnlocked(settings)).toBe(false);
  await markUnlocked(settings);
  expect(await isUnlocked(createSettings(db))).toBe(true);
});
