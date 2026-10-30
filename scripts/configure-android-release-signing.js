const fs = require('fs');

const file = 'android/app/build.gradle';
let src = fs.readFileSync(file, 'utf8');

if (src.includes("def ciStoreFile = System.getenv('SIGNING_STORE_FILE')")) {
  console.log('Release signing is already configured');
  process.exit(0);
}

const debugKeystore =
  /debug \{\s*storeFile file\('debug\.keystore'\)\s*storePassword 'android'\s*keyAlias 'androiddebugkey'\s*keyPassword 'android'\s*\}/;

if (!debugKeystore.test(src)) {
  const at = src.indexOf('signingConfigs');
  console.error('Could not find the debug signingConfig in android/app/build.gradle');
  console.error(at === -1 ? src.slice(0, 500) : src.slice(at, at + 500));
  process.exit(1);
}

const releaseConfig = `
        release {
            def ciStoreFile = System.getenv('SIGNING_STORE_FILE')
            if (ciStoreFile) {
                storeFile file(ciStoreFile)
                storePassword System.getenv('SIGNKEY_STORE_PASSWORD')
                keyAlias System.getenv('SIGNKEY_KEY_ALIAS')
                keyPassword System.getenv('SIGNKEY_KEY_PASSWORD')
            }
        }`;

src = src.replace(debugKeystore, (match) => `${match}${releaseConfig}`);

const releaseBuildType =
  /release \{\s*\/\/ Caution! In production, you need to generate your own keystore file\.\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\s*signingConfig signingConfigs\.debug/;

if (!releaseBuildType.test(src)) {
  console.error('Could not find the release signingConfig line in android/app/build.gradle');
  process.exit(1);
}

src = src.replace(releaseBuildType, (match) =>
  match.replace(
    'signingConfig signingConfigs.debug',
    "signingConfig System.getenv('SIGNING_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
  )
);

fs.writeFileSync(file, src);
console.log('Configured release signing');
