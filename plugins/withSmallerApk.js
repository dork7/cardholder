// Shrinks the Android download. Applied on every `expo prebuild`, because android/ is regenerated.
// - Compresses the JS bundle and the Java/Kotlin code, which Android otherwise stores uncompressed.
//   Startup reads them from the compressed file, a small cost for a smaller download.
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARK = '// withSmallerApk';

function setProperty(props, key, value) {
  const existing = props.find((p) => p.type === 'property' && p.key === key);
  if (existing) existing.value = value;
  else props.push({ type: 'property', key, value });
}

module.exports = function withSmallerApk(config) {
  config = withGradleProperties(config, (cfg) => {
    setProperty(cfg.modResults, 'android.enableBundleCompression', 'true');
    return cfg;
  });
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARK)) return cfg;
    cfg.modResults.contents += `
${MARK}
android {
    packaging {
        dex {
            useLegacyPackaging true
        }
    }
}
`;
    return cfg;
  });
};
