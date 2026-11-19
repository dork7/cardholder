const { withMainActivity } = require('expo/config-plugins');
const { addRecentsScreenshotFlag } = require('./recentsScreenshotTransform');

module.exports = function withRecentsScreenshotDisabled(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withRecentsScreenshotDisabled expects a Kotlin MainActivity');
    }
    cfg.modResults.contents = addRecentsScreenshotFlag(cfg.modResults.contents);
    return cfg;
  });
};
