import { DAY_MS, RECENTLY_DELETED_DAYS } from '../config';

// Whole days until a document deleted at `deletedAt` is erased; a part day counts as one.
export function daysLeft(deletedAt: number, now: number): number {
  return Math.max(0, Math.ceil((deletedAt + RECENTLY_DELETED_DAYS * DAY_MS - now) / DAY_MS));
}
