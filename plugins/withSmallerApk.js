// Shrinks the Android download. Applied on every `expo prebuild`, because android/ is regenerated.
// - Compresses the JS bundle and the Java/Kotlin code, which Android otherwise stores uncompressed.
//   Startup reads them from the compressed file, a small cost for a smaller download.
// - Drops llama.rn's Qualcomm Hexagon (NPU) add-ons, which the app doesn't use. app.json
//   (expo-build-properties) keeps the generic, v8_2_dotprod and the OpenCL engine: the OpenCL one runs
//   the downloaded models on the GPU of Snapdragon 8 Gen 1 and later phones (ADR 0006).
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
