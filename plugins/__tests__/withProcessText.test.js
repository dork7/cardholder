const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const withProcessText = require('../withProcessText');

let projectRoot;
beforeEach(async () => { projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'doc-keeper-process-text-')); });
afterEach(async () => { await fs.rm(projectRoot, { recursive: true, force: true }); });

test('prebuild registers one exported plain-text selection activity and generates its share adapter', async () => {
  const config = withProcessText({ name: 'Doc Keeper', slug: 'cardholder', android: { package: 'com.hamza.cardholder' } });
  const modRequest = { projectRoot, platformProjectRoot: path.join(projectRoot, 'android'), platform: 'android' };
  let manifest = { manifest: { application: [{ $: { 'android:name': '.MainApplication' }, activity: [{ $: { 'android:name': '.MainActivity' } }] }] } };
  // Repeated prebuilds must not accumulate menu entries.
  for (let i = 0; i < 2; i++) {
    const result = await config.mods.android.manifest({ ...config, modRequest, modResults: manifest });
    manifest = result.modResults;
    await config.mods.android.dangerous({ ...config, modRequest, modResults: {} });
  }
  const activities = manifest.manifest.application[0].activity;
  expect(activities).toHaveLength(2);
  expect(activities[1]).toMatchObject({
    $: { 'android:name': '.ProcessTextActivity', 'android:exported': 'true', 'android:noHistory': 'true' },
    'intent-filter': [{
      action: [{ $: { 'android:name': 'android.intent.action.PROCESS_TEXT' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: [{ $: { 'android:mimeType': 'text/plain' } }],
    }],
  });
  const source = await fs.readFile(path.join(projectRoot, 'android/app/src/main/java/com/hamza/cardholder/ProcessTextActivity.java'), 'utf8');
  expect(source).toContain('getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)');
  expect(source).toContain('new Intent(this, MainActivity.class)');
  expect(source).toContain('setAction(Intent.ACTION_SEND)');
  expect(source).toContain('putExtra(Intent.EXTRA_TEXT, text.toString())');
  expect(source).toContain('Intent.FLAG_ACTIVITY_NEW_TASK');
  expect(source).toContain('Intent.FLAG_ACTIVITY_SINGLE_TOP');
  expect(config.mods.ios).toBeUndefined();
});

test('the app enables plain-text sharing on Android and leaves the iOS extension disabled', () => {
  const plugins = require('../../app.json').expo.plugins;
  expect(plugins).toContain('./plugins/withProcessText');
  const [, options] = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-share-intent');
  expect(options.androidIntentFilters).toEqual(expect.arrayContaining(['text/plain', 'image/*', 'application/pdf']));
  expect(options.disableIOS).toBe(true);
});
