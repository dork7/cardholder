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
// Per side; card reading rarely finds a tenth of this, so it only stops a bad backup file from bloating a card.
export const READ_TEXT_MAX_LENGTH = 4000;
// Hidden for now: no folder UI anywhere, and new cards aren't sorted into folders. Saved folders are kept.
export const FOLDERS_ENABLED = false;

export const MIN_PASSPHRASE_LENGTH = 3;
export const PBKDF2_ITERATIONS = 600_000;

// Each card with an expiry date is reminded every day, at REMINDER_HOUR, from this many days before it
// expires until the day it does. The user can change it per card.
export const DEFAULT_REMIND_DAYS = 14;
export const MAX_REMIND_DAYS = 365;
export const REMINDER_HOUR = 9;
// A card this close to expiry is flagged in the app.
export const EXPIRY_SOON_DAYS = 30;
// iOS keeps at most 64 pending local notifications per app.
export const MAX_SCHEDULED_REMINDERS = 60;

// iOS shows four home-screen quick actions; one is Add card.
export const MAX_CARD_SHORTCUTS = 3;

// With the app lock on, time in the background after which the app asks to be unlocked again.
export const LOCK_AFTER_BACKGROUND_MS = 30_000;


export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_QUALITY = 0.8;
// Wide enough to stay sharp on a phone-wide card in the home stack (about 1200 px on most phones).
export const THUMB_WIDTH = 1000;
export const THUMB_QUALITY = 0.85;
// A PDF card keeps the whole file, inside every backup too.
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
// Page previews in the page picker.
export const PDF_PICKER_EDGE = 320;

// Diagnostics (src/diagnostics/). The log and the last crash stay on the phone until the user sends
// them from Settings → Problems (ADR 0007). The email button needs an address; empty hides it and
// leaves the share sheet, which works anywhere.
export const CRASH_REPORT_EMAIL = '';
export const LOG_KEEP_LINES = 300;
export const LOG_FILE_MAX_BYTES = 128 * 1024;
// What a mailto: link can carry safely; the share sheet sends the whole report.
export const REPORT_EMAIL_MAX_CHARS = 8000;
