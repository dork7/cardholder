import { isValidIsoDate } from '../time/dates';

// Reading digits and dates the way documents print them, for the card-reading rules.

// Arabic-Indic (٠–٩) and Eastern Arabic-Indic (۰–۹) digits → 0–9.
export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

// Dates as cards print them → YYYY-MM-DD. UAE cards put the day first, so 09/11/2030 is 9 November.
// A month-only date (06/2027) means valid through the end of that month.
export function printedDateToIso(printed: string): string | null {
  const s = normalizeDigits(printed).trim().toLowerCase();
  let year: number, month: number, day: number;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) {
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4}|\d{2})$/.exec(s))) {
    [day, month, year] = [Number(m[1]), Number(m[2]), fullYear(m[3])];
  } else if ((m = /^(\d{1,2})[-/. ]([a-z]{3})[a-z]*[-/. ,]+(\d{4})$/.exec(s))) {
    [day, month, year] = [Number(m[1]), MONTHS.indexOf(m[2]) + 1, Number(m[3])];
  } else if ((m = /^(\d{1,2})[-/.](\d{4}|\d{2})$/.exec(s))) {
    [month, year] = [Number(m[1]), fullYear(m[2])];
    day = month >= 1 && month <= 12 ? lastDay(year, month) : 0;
  } else {
    return null;
  }
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}
