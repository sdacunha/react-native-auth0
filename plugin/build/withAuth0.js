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
  return generateCode_1.mergeContents({
    tag: 'react-native-auth0-manifest-placeholder',
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
const addAuth0AppDelegateCode = src => {
  let tempSrc = src;
  // Tests to see if the RCTLinkingManager has already been added
  if (
    !/\[RCTLinkingManager.*application:.*openURL:.*options:.*\]/.test(tempSrc)
  ) {
    tempSrc = generateCode_1.mergeContents({
      src: tempSrc,
      newSrc: [
        '- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url',
        '            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options',
        '{',
        '  return [RCTLinkingManager application:app openURL:url options:options];',
        '}',
      ].join('\n'),
      tag: 'react-native-auth0-linking',
      anchor: /@end/,
      comment: '//',
      offset: 0,
    }).contents;
  }
  // Checks to see if RCTLinkingManager hasn't been imported
  if (!/RCTLinkingManager\.h/.test(tempSrc)) {
    tempSrc = generateCode_1.mergeContents({
      src: tempSrc,
      newSrc: `#import <React/RCTLinkingManager.h>`,
      anchor: /#import <React\/RCTBridge\.h>/,
      offset: 1,
      tag: 'react-native-auth0-import',
      comment: '//',
    }).contents;
  }
  return tempSrc;
};
exports.addAuth0AppDelegateCode = addAuth0AppDelegateCode;
const withIOSAuth0AppDelegate = config => {
  return config_plugins_1.withAppDelegate(config, config => {
    const src = config.modResults.contents;
    config.modResults.contents = exports.addAuth0AppDelegateCode(src);
    return config;
  });
};
const withIOSAuth0InfoPList = config => {
  return config_plugins_1.withInfoPlist(config, config => {
    if (!config.modResults.CFBundleURLSchemes) {
      config.modResults.CFBundleURLSchemes = [];
    }
    config.modResults.CFBundleURLTypes = [
      {
        CFBundleURLName: 'auth0',
        CFBundleURLSchemes: ['$(PRODUCT_BUNDLE_IDENTIFIER)'],
      },
    ];
    return config;
  });
};
const withAuth0 = config => {
  config = withAndroidAuth0Gradle(config);
  config = withIOSAuth0AppDelegate(config);
  config = withIOSAuth0InfoPList(config);
  return config;
};
exports.default = config_plugins_1.createRunOncePlugin(
  withAuth0,
  pkg.name,
  pkg.version,
);
