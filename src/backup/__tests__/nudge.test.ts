import { fields, images, makeStore } from '../../../test/fixtures';
import { BACKUP_SNOOZE_MS, BACKUP_STALE_MS } from '../../config';
import { createSettings } from '../../storage/settings';
import { readNudgeInput, recordExport, shouldNudgeBackup, snoozeBackupNudge } from '../nudge';

const now = 10_000_000_000;
const base = { cardCount: 1, lastChangeAt: now - 1_000, lastExportAt: null, snoozedUntil: null, now };

test('no cards, no nudge', () => {
  expect(shouldNudgeBackup({ ...base, cardCount: 0 })).toBe(false);
});

test('never exported → nudge', () => {
  expect(shouldNudgeBackup(base)).toBe(true);
});

test('snoozed → no nudge until the snooze ends', () => {
  expect(shouldNudgeBackup({ ...base, snoozedUntil: now + 1 })).toBe(false);
  expect(shouldNudgeBackup({ ...base, snoozedUntil: now - 1 })).toBe(true);
});

test('recent export → no nudge even with changes', () => {
  expect(shouldNudgeBackup({ ...base, lastExportAt: now - BACKUP_STALE_MS + 1_000, lastChangeAt: now })).toBe(false);
});

test('old export with changes since → nudge', () => {
  const lastExportAt = now - BACKUP_STALE_MS - 1_000;
  expect(shouldNudgeBackup({ ...base, lastExportAt, lastChangeAt: lastExportAt + 1 })).toBe(true);
});

test('old export with no changes since → no nudge', () => {
  const lastExportAt = now - BACKUP_STALE_MS - 1_000;
  expect(shouldNudgeBackup({ ...base, lastExportAt, lastChangeAt: lastExportAt - 1 })).toBe(false);
});

test('readNudgeInput, snooze and recordExport work against real storage', async () => {
  const { db, store } = await makeStore();
  const settings = createSettings(db);
  const card = await store.create(fields(), images('a'));

  expect(await readNudgeInput(store, settings, now)).toEqual({
    cardCount: 1,
    lastChangeAt: card.updatedAt,
    lastExportAt: null,
    snoozedUntil: null,
    now,
  });

  await snoozeBackupNudge(settings, now);
  expect((await readNudgeInput(store, settings, now)).snoozedUntil).toBe(now + BACKUP_SNOOZE_MS);

  await recordExport(settings, now);
  const after = await readNudgeInput(store, settings, now);
  expect(after.lastExportAt).toBe(now);
  expect(after.snoozedUntil).toBeNull();
});
