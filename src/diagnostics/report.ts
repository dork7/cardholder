import { REPORT_EMAIL_MAX_CHARS } from '../config';
import { CrashRecord } from './crashes';

// A crash report as plain text: enough to find the bug, nothing about the user's documents.

export interface ReportContext {
  appVersion: string;
  // The native build (versionCode on Android, CFBundleVersion on iOS); '' when unknown.
  build: string;
  platform: string;
  osVersion: string;
  device: string;
}

const KIND_LABEL: Record<CrashRecord['kind'], string> = {
  js: 'Error in the app (JavaScript)',
  native: 'Crash (native)',
  anr: 'Stopped responding',
  'unexpected-exit': 'Closed while open (no error was recorded)',
};

export function buildReport(crash: CrashRecord | null, context: ReportContext, log: string): string {
  const lines = [
    'Doc Keeper report',
    `App: ${context.appVersion}${context.build ? ` (${context.build})` : ''}`,
    `Phone: ${context.device}, ${context.platform} ${context.osVersion}`,
    `Made: ${new Date().toISOString()}`,
    '',
  ];
  if (crash) {
    lines.push(`When: ${new Date(crash.at).toISOString()}`, `What: ${KIND_LABEL[crash.kind]}`, crash.message);
    if (crash.detail) lines.push(crash.detail);
  } else {
    lines.push('No unexpected close recorded.');
  }
  lines.push('', '--- Log (oldest first) ---', log.trimEnd() || '(empty)', '');
  return lines.join('\n');
}

export const reportSubject = (crash: CrashRecord | null, context: ReportContext): string =>
  crash ? `Doc Keeper ${context.appVersion} ${context.platform}: ${crash.message.slice(0, 80)}` : `Doc Keeper ${context.appVersion} ${context.platform}: log`;

// A mailto: link with the report in the body. Mail apps cap what a link can carry, so a long report
// keeps its head (the crash) and loses the oldest log lines; the share sheet sends the whole file.
export function emailUrl(address: string, subject: string, body: string): string {
  let text = body;
  if (text.length > REPORT_EMAIL_MAX_CHARS) {
    const cut = '\n[… older log lines left out; "Share report" sends them all]\n';
    text = text.slice(0, REPORT_EMAIL_MAX_CHARS - cut.length) + cut;
  }
  return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
