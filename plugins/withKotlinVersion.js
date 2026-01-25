const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withKotlinVersion(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let c = cfg.modResults.contents;

    if (!c.includes("kotlinVersion")) {
      c = c.replace(
        /buildscript\s*\{\s*\n/,
        (m) => `${m}ext.kotlinVersion = "2.0.21"\n`
      );
    }

    cfg.modResults.contents = c;
    return cfg;
  });
};
