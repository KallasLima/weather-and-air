const { withAppBuildGradle, withMainApplication } = require('expo/config-plugins');

// CMake hashes long object paths at this limit, avoiding Ninja's Windows path limit.
// Generated for the Expo 58 Groovy template; kept in a config plugin so prebuild is reproducible.
module.exports = function withShortNativePaths(config) {
  config = withMainApplication(config, (result) => {
    // Expo 58's factory defaults to the React library variant; select the application's variant.
    const anchor = 'context = applicationContext,';
    if (!result.modResults.contents.includes('useDevSupport = BuildConfig.DEBUG')) {
      if (!result.modResults.contents.includes(anchor))
        throw new Error('Expected the Expo 58 Kotlin application template.');
      result.modResults.contents = result.modResults.contents.replace(
        anchor,
        anchor + '\n      useDevSupport = BuildConfig.DEBUG,',
      );
    }
    return result;
  });
  return withAppBuildGradle(config, (result) => {
    const marker = '// portfolio-cmake-object-paths';
    if (result.modResults.language !== 'groovy')
      throw new Error('Expected the Expo 58 Groovy Android template.');
    if (!result.modResults.contents.includes(marker)) {
      result.modResults.contents += `
${marker}
android {
  defaultConfig {
    externalNativeBuild {
      cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" }
    }
  }
}
`;
    }
    return result;
  });
};
