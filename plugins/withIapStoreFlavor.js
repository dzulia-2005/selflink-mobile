const { withAppBuildGradle } = require('@expo/config-plugins');

const STRATEGY_LINE = 'missingDimensionStrategy "store", "play"';

const addMissingDimensionStrategy = (contents) => {
  if (contents.includes(STRATEGY_LINE)) {
    return contents;
  }
  const match = contents.match(/defaultConfig\s*\{/);
  if (!match) {
    return contents;
  }
  return contents.replace(match[0], `${match[0]}\n        ${STRATEGY_LINE}`);
};

module.exports = function withIapStoreFlavor(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }
    config.modResults.contents = addMissingDimensionStrategy(config.modResults.contents);
    return config;
  });
};
