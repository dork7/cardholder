const MARKER = 'setRecentsScreenshotEnabled(false)';
const ON_CREATE = /super\.onCreate\([^)]*\)/;

// Hides the app's content in Android 13+ recents without blocking screenshots (unlike FLAG_SECURE).
function addRecentsScreenshotFlag(source) {
  if (source.includes(MARKER)) return source;
  if (!ON_CREATE.test(source)) {
    throw new Error('withRecentsScreenshotDisabled: could not find super.onCreate(...) in MainActivity');
  }
  return source.replace(
    ON_CREATE,
    (call) => `${call}\n    if (android.os.Build.VERSION.SDK_INT >= 33) {\n      ${MARKER}\n    }`,
  );
}

module.exports = { addRecentsScreenshotFlag };
