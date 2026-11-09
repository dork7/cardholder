// Shrinks the Android download. Applied on every `expo prebuild`, because android/ is regenerated.
// - Compresses the JS bundle and the Java/Kotlin code, which Android otherwise stores uncompressed.
//   Startup reads them from the compressed file, a small cost for a smaller download.
// - Drops llama.rn's Qualcomm Hexagon add-ons. Their engine copy is excluded in app.json
//   (expo-build-properties), which keeps only the generic and the v8_2_dotprod engines.
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
    androidResources {
        ignoreAssetsPattern += ':<dir>ggml-hexagon'
    }
}
`;
    return cfg;
  });
};
