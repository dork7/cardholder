export const DAY_MS = 24 * 60 * 60 * 1000;

export const FREE_CARD_LIMIT = 4;
// Off while testing: there is no paywall yet, so the limit would strand people at FREE_CARD_LIMIT cards.
export const CARD_LIMIT_ENABLED = false;
export const UNLOCK_PRODUCT_ID = 'cardholder.unlimited';

export const NAME_MAX_LENGTH = 60;
export const TAG_MAX_LENGTH = 24;
export const MAX_TAGS = 8;
export const FOLDER_NAME_MAX_LENGTH = 30;
export const CATEGORY_MAX_LENGTH = 24;
// Hidden for now: no folder UI anywhere, and new cards aren't sorted into folders. Saved folders are kept.
export const FOLDERS_ENABLED = false;

export const MIN_PASSPHRASE_LENGTH = 8;
export const PBKDF2_ITERATIONS = 600_000;

export const REMINDER_DAYS_BEFORE = [30, 7] as const;
export const REMINDER_HOUR = 9;
// A card this close to expiry is flagged in the app; matches the first reminder.
export const EXPIRY_SOON_DAYS = Math.max(...REMINDER_DAYS_BEFORE);
// iOS keeps at most 64 pending local notifications per app.
export const MAX_SCHEDULED_REMINDERS = 60;

// iOS shows four home-screen quick actions; one is Add card.
export const MAX_CARD_SHORTCUTS = 3;

// With the app lock on, time in the background after which the app asks to be unlocked again.
export const LOCK_AFTER_BACKGROUND_MS = 30_000;

export const BACKUP_STALE_MS = 30 * DAY_MS;
export const BACKUP_SNOOZE_MS = 7 * DAY_MS;

export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_QUALITY = 0.8;
export const THUMB_WIDTH = 400;
// A PDF card keeps the whole file, inside every backup too.
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
// Page previews in the page picker.
export const PDF_PICKER_EDGE = 320;

