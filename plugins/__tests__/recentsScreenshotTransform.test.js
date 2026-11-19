const { addRecentsScreenshotFlag } = require('../recentsScreenshotTransform');

const MAIN_ACTIVITY = `package com.hamza.cardholder

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }
}
`;

test('adds the Android 13+ flag right after super.onCreate', () => {
  expect(addRecentsScreenshotFlag(MAIN_ACTIVITY)).toContain(
    'super.onCreate(null)\n    if (android.os.Build.VERSION.SDK_INT >= 33) {\n      setRecentsScreenshotEnabled(false)\n    }',
  );
});

test('is idempotent', () => {
  const once = addRecentsScreenshotFlag(MAIN_ACTIVITY);
  expect(addRecentsScreenshotFlag(once)).toBe(once);
});

test('fails loudly when there is no onCreate to hook', () => {
  expect(() => addRecentsScreenshotFlag('class MainActivity : ReactActivity() {}')).toThrow('super.onCreate');
});
