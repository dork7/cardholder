import { requireOptionalNativeModule } from 'expo';
import { CrashNative, NativeExit } from './crashes';

interface CrashLogNative {
  // Android 11 and later only; false elsewhere.
  exitReasonsAvailable(): boolean;
  lastExits(sinceMs: number): NativeExit[];
}

// modules/crash-log. Its handlers for native exceptions are installed on the native side when the
// module loads; this only reads the system's exit reasons. Absent in builds made before it was added.
const native = requireOptionalNativeModule<CrashLogNative>('CrashLog');

export const crashNative: CrashNative = {
  lastExits: native && native.exitReasonsAvailable() ? (sinceMs) => native.lastExits(sinceMs) : null,
};
