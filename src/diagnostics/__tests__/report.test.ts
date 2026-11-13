import { REPORT_EMAIL_MAX_CHARS } from '../../config';
import { buildReport, emailUrl, ReportContext, reportSubject } from '../report';

const context: ReportContext = { appVersion: '1.2.0', build: '1002000', platform: 'Android', osVersion: '14', device: 'Google Pixel 7' };
const crash = { at: 1_700_000_000_000, kind: 'js' as const, message: 'TypeError: Cannot read x', detail: 'at Home (index.tsx:40)' };

test('a report names the app, the phone, the crash and the log, and nothing else', () => {
  const text = buildReport(crash, context, '2023-11-14T22:13:00.000Z WARN  Boot failed\n');
  expect(text).toContain('App: 1.2.0 (1002000)');
  expect(text).toContain('Phone: Google Pixel 7, Android 14');
  expect(text).toContain('When: 2023-11-14T22:13:20.000Z');
  expect(text).toContain('What: Error in the app (JavaScript)\nTypeError: Cannot read x\nat Home (index.tsx:40)');
  expect(text).toContain('--- Log (oldest first) ---\n2023-11-14T22:13:00.000Z WARN  Boot failed');
  expect(reportSubject(crash, context)).toBe('Doc Keeper 1.2.0 Android: TypeError: Cannot read x');
});

test('without a crash it is a log only', () => {
  const text = buildReport(null, { ...context, build: '' }, '');
  expect(text).toContain('App: 1.2.0\n');
  expect(text).toContain('No unexpected close recorded.');
  expect(text).toContain('(empty)');
  expect(reportSubject(null, context)).toBe('Doc Keeper 1.2.0 Android: log');
});

test('the mail link carries the whole report when it fits, and the head of it when not', () => {
  const short = emailUrl('dev@example.com', 'Subject', 'line 1\nline 2');
  expect(short).toBe('mailto:dev%40example.com?subject=Subject&body=line%201%0Aline%202');
  const long = emailUrl('dev@example.com', 'S', 'HEAD\n' + 'x'.repeat(REPORT_EMAIL_MAX_CHARS * 2));
  const body = decodeURIComponent(long.split('&body=')[1]);
  expect(body.length).toBeLessThanOrEqual(REPORT_EMAIL_MAX_CHARS);
  expect(body.startsWith('HEAD\n')).toBe(true);
  expect(body).toContain('older log lines left out');
});
