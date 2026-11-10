import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { CRASH_REPORT_EMAIL } from '../config';
import { strings } from '../strings';
import { CrashRecord } from './crashes';
import { getDiagnostics } from './install';
import { formatLine, readLogFiles } from './log';
import { buildReport, emailUrl, ReportContext, reportSubject } from './report';

// Sending a report is the only time anything from diagnostics leaves the phone, and only the user
// does it, from Settings → Problems or the crash prompt (ADR 0007).

export const canEmail = CRASH_REPORT_EMAIL !== '';

function context(): ReportContext {
  return {
    appVersion: Constants.expoConfig?.version ?? '',
    // The installed build's own number (versionCode / CFBundleVersion), not what app.json says.
    build: Constants.nativeBuildVersion ?? '',
    platform: Device.osName ?? Platform.OS,
    osVersion: Device.osVersion ?? '',
    device: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'unknown',
  };
}

// The report text: the crash (if any), then the log on disk plus the lines of this run.
export function reportText(crash: CrashRecord | null): string {
  const { files, logger } = getDiagnostics();
  const onDisk = readLogFiles(files);
  const thisRun = logger
    .recent()
    .map(formatLine)
    .filter((line) => !onDisk.includes(line))
    .join('\n');
  return buildReport(crash, context(), [onDisk, thisRun].filter(Boolean).join('\n'));
}

// Opens the user's mail app with the report filled in. False when no app takes mailto: links.
export async function emailReport(crash: CrashRecord | null): Promise<boolean> {
  const url = emailUrl(CRASH_REPORT_EMAIL, reportSubject(crash, context()), reportText(crash));
  if (!(await Linking.canOpenURL(url))) return false;
  await Linking.openURL(url);
  return true;
}

// Hands the report to the share sheet as a text file, for mail, messages or saving.
export async function shareReport(crash: CrashRecord | null): Promise<void> {
  const file = new File(Paths.cache, 'Doc Keeper report.txt');
  file.create({ overwrite: true, intermediates: true });
  await file.write(reportText(crash));
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text', dialogTitle: strings.report.share });
  } finally {
    if (file.exists) file.delete();
  }
}
