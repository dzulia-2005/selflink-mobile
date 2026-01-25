const { withAppBuildGradle } = require("@expo/config-plugins");

function addMissingDimensionStrategy(contents) {
  const line = 'missingDimensionStrategy "store", "play"';

  // Idempotent: don't add twice
  if (contents.includes(line)) return contents;

  // Insert inside defaultConfig { ... }
  const re = /defaultConfig\s*\{\s*\n/;
  if (!re.test(contents)) {
    throw new Error(
      "withIapStoreFlavor: defaultConfig block not found in android/app/build.gradle"
    );
  }

  return contents.replace(re, (m) => `${m}        ${line}\n`);
}

module.exports = function withIapStoreFlavor(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addMissingDimensionStrategy(cfg.modResults.contents);
    return cfg;
  });
};
