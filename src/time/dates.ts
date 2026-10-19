import { DAY_MS } from '../config';
import { strings } from '../strings';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(s: string): { year: number; month: number; day: number } | null {
  const m = ISO_DATE.exec(s);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function isValidIsoDate(s: string): boolean {
  return parseIsoDate(s) !== null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIsoDate(s: string): Date {
  const parts = parseIsoDate(s);
  if (!parts) throw new Error(`Invalid date: ${s}`);
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function formatAgo(then: number, now: number): string {
  const days = Math.floor(Math.max(0, now - then) / DAY_MS);
  if (days < 1) return strings.ago.today;
  if (days < 2) return strings.ago.yesterday;
  if (days < 30) return strings.ago.days(days);
  if (days < 365) return strings.ago.months(Math.floor(days / 30));
  return strings.ago.years(Math.floor(days / 365));
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
