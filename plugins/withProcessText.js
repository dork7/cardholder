// Android's selection menu uses PROCESS_TEXT, while expo-share-intent receives SEND. Generate a
// tiny adapter activity on prebuild so both entry points use the same lock-aware note flow.
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs/promises');
const path = require('path');

module.exports = function withProcessText(config) {
  const packageName = config.android?.package;
  if (!packageName) throw new Error('withProcessText requires android.package');

  config = withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.activity = (application.activity ?? []).filter((activity) => activity.$['android:name'] !== '.ProcessTextActivity');
    application.activity.push({
      $: {
        'android:name': '.ProcessTextActivity',
        'android:exported': 'true',
        'android:noHistory': 'true',
        'android:excludeFromRecents': 'true',
      },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'android.intent.action.PROCESS_TEXT' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      }],
    });
    return cfg;
  });

  return withDangerousMod(config, ['android', async (cfg) => {
    const directory = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'));
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'ProcessTextActivity.java'), `package ${packageName};

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

// Does not modify the sending app's selection, even when that selection is editable.
public class ProcessTextActivity extends Activity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent incoming = getIntent();
        if (Intent.ACTION_PROCESS_TEXT.equals(incoming.getAction())) {
            CharSequence text = incoming.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
            if (text != null && !text.toString().trim().isEmpty()) {
                Intent share = new Intent(this, MainActivity.class)
                    .setAction(Intent.ACTION_SEND)
                    .setType("text/plain")
                    .putExtra(Intent.EXTRA_TEXT, text.toString())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(share);
            }
        }
        finish();
    }
}
`);
    return cfg;
  }]);
};
