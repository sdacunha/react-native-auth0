'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.addAuth0AppDelegateCode = exports.addAuth0GradleValues = void 0;
const config_plugins_1 = require('@expo/config-plugins');
const generateCode_1 = require('@expo/config-plugins/build/utils/generateCode');
const pkg = require('@sdacunha/react-native-auth0/package.json');
const addAuth0GradleValues = (src, auth0Domain, auth0Scheme) => {
  if (!auth0Domain) {
    throw Error('No auth0 domain specified in expo config (extra.auth0Domain)');
  }
  if (!auth0Scheme) {
    throw Error('No auth0 scheme specified in expo config (extra.auth0Scheme)');
  }
  const tag = 'react-native-auth0';
  return generateCode_1.mergeContents({
    tag,
    src,
    newSrc: `manifestPlaceholders = [auth0Domain: "${auth0Domain}", auth0Scheme: "${auth0Scheme}"]`,
    anchor: /defaultConfig {/,
    offset: 1,
    comment: '//',
  }).contents;
};
exports.addAuth0GradleValues = addAuth0GradleValues;
const withAndroidAuth0Gradle = config => {
  return config_plugins_1.withAppBuildGradle(config, config => {
    var _a, _b;
    if (config.modResults.language === 'groovy') {
      const auth0Domain =
        process.env.EXPO_AUTH0_DOMAIN ||
        ((_a = config.extra) === null || _a === void 0
          ? void 0
          : _a['auth0Domain']);
      const auth0Scheme =
        process.env.EXPO_AUTH0_SCHEME ||
        ((_b = config.extra) === null || _b === void 0
          ? void 0
          : _b['auth0Scheme']) ||
        '${applicationId}';
      config.modResults.contents = exports.addAuth0GradleValues(
        config.modResults.contents,
        auth0Domain,
        auth0Scheme,
      );
      return config;
    } else {
      throw new Error(
        'Cannot add auth0 build.gradle modifications because the build.gradle is not groovy',
      );
    }
  });
};
function appendContents(src, newSrc, tag, comment) {
  const header = generateCode_1.createGeneratedHeaderComment(
    newSrc,
    tag,
    comment,
  );
  if (!src.includes(header)) {
    // Ensure the old generated contents are removed.
    const sanitizedTarget = generateCode_1.removeGeneratedContents(src, tag);
    const contentsToAdd = [
      // @something
      header,
      // contents
      newSrc,
      // @end
      `${comment} @generated end ${tag}`,
    ].join('\n');
    return {
      contents:
        sanitizedTarget !== null && sanitizedTarget !== void 0
          ? sanitizedTarget
          : src + contentsToAdd,
      didMerge: true,
      didClear: !!sanitizedTarget,
    };
  }
  return {contents: src, didClear: false, didMerge: false};
}
const addAuth0AppDelegateCode = src => {
  const tag = 'react-native-auth0';
  return appendContents(
    src,
    [
      '- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url',
      '            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options',
      '{',
      '  return [RCTLinkingManager application:app openURL:url options:options];',
      '}',
    ].join('\n'),
    tag,
    '//',
  ).contents;
};
exports.addAuth0AppDelegateCode = addAuth0AppDelegateCode;
const withIOSAuth0AppDelegate = config => {
  return config_plugins_1.withAppDelegate(config, config => {
    const src = config.modResults.contents;
    config.modResults.contents = exports.addAuth0AppDelegateCode(src);
    return config;
  });
};
const withAuth0 = config => {
  config = withAndroidAuth0Gradle(config);
  config = withIOSAuth0AppDelegate(config);
  return config;
};
exports.default = config_plugins_1.createRunOncePlugin(
  withAuth0,
  pkg.name,
  pkg.version,
);
