export const DAY_MS = 24 * 60 * 60 * 1000;

export const FREE_CARD_LIMIT = 4;
export const UNLOCK_PRODUCT_ID = 'cardholder.unlimited';

export const NAME_MAX_LENGTH = 60;

export const MIN_PASSPHRASE_LENGTH = 8;
export const PBKDF2_ITERATIONS = 600_000;

export const REMINDER_DAYS_BEFORE = [30, 7] as const;
export const REMINDER_HOUR = 9;
// iOS keeps at most 64 pending local notifications per app.
export const MAX_SCHEDULED_REMINDERS = 60;

export const BACKUP_STALE_MS = 30 * DAY_MS;
export const BACKUP_SNOOZE_MS = 7 * DAY_MS;

export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_QUALITY = 0.8;
export const THUMB_WIDTH = 400;
