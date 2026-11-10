import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { collectCrash, installCrashHandlers, markRunning, RUNNING_MARKER, setPendingCrash } from './crashes';
import { createDiagnosticsFiles, DiagnosticsFiles } from './files';
import { captureConsole, createLogger, Logger } from './log';
import { crashNative } from './native';

// Turns diagnostics on for the app: run once, as early as possible (app/_layout.tsx imports it at the
// top), so the handlers are in place before the first screen renders.

interface Diagnostics {
  files: DiagnosticsFiles;
  logger: Logger;
}

let diagnostics: Diagnostics | null = null;

export function getDiagnostics(): Diagnostics {
  if (!diagnostics) {
    const files = createDiagnosticsFiles();
    diagnostics = { files, logger: createLogger(files) };
  }
  return diagnostics;
}

export const log = (): Logger => getDiagnostics().logger;

let installed = false;

export function installDiagnostics(): void {
  if (installed) return;
  installed = true;
  const { files, logger } = getDiagnostics();
  captureConsole(logger);

  const errorUtils = (globalThis as { ErrorUtils?: Parameters<typeof installCrashHandlers>[0]['errorUtils'] }).ErrorUtils;
  const hermes = (globalThis as { HermesInternal?: Parameters<typeof installCrashHandlers>[0]['hermes'] }).HermesInternal;
  if (errorUtils) {
    installCrashHandlers({ files, logger, errorUtils, hermes, defaultRejectionHandler: reactNativeRejectionHandler() });
  }

  // Development reloads leave the marker behind every time, so the heuristic is for release builds.
  const useMarker = !__DEV__;
  const wasRunning = files.read(RUNNING_MARKER) !== null;
  if (useMarker) {
    void markRunning(files, true);
    AppState.addEventListener('change', (state) => void markRunning(files, state === 'active'));
  }

  logger.info(`App started: Doc Keeper ${Constants.expoConfig?.version ?? ''}`);
  collectCrash(files, crashNative, { wasRunning, useMarker })
    .then((pending) => setPendingCrash(files, pending))
    .catch((e) => logger.warn('Checking for a crash failed', e));
}

// React Native's own unhandled-rejection reporting, so development keeps its warning box.
function reactNativeRejectionHandler(): ((id: number, rejection: unknown) => void) | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const options = require('react-native/Libraries/promiseRejectionTrackingOptions').default as {
      onUnhandled?: (id: number, rejection: unknown) => void;
    };
    return options.onUnhandled;
  } catch {
    return undefined;
  }
}
