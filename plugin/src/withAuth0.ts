import {
  ConfigPlugin,
  createRunOncePlugin,
  withAppBuildGradle,
  withAppDelegate,
  withInfoPlist,
} from '@expo/config-plugins';
import {mergeContents} from '@expo/config-plugins/build/utils/generateCode';

const pkg = require('react-native-auth0/package.json');

export const addAuth0GradleValues = (
  src: string,
  auth0Domain?: string,
  auth0Scheme?: string,
): string => {
  if (!auth0Domain) {
    throw Error('No auth0 domain specified in expo config (extra.auth0Domain)');
  }
  if (!auth0Scheme) {
    throw Error('No auth0 scheme specified in expo config (extra.auth0Scheme)');
  }
  return mergeContents({
    tag: 'react-native-auth0-manifest-placeholder',
    src,
    newSrc: `manifestPlaceholders = [auth0Domain: "${auth0Domain}", auth0Scheme: "${auth0Scheme}"]`,
    anchor: /defaultConfig {/,
    offset: 1,
    comment: '//',
  }).contents;
};

const withAndroidAuth0Gradle: ConfigPlugin = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      const auth0Domain =
        process.env.EXPO_AUTH0_DOMAIN || config.extra?.['auth0Domain'];
      const auth0Scheme =
        process.env.EXPO_AUTH0_SCHEME_ANDROID ||
        process.env.EXPO_AUTH0_SCHEME ||
        config.extra?.['auth0SchemeAndroid'] ||
        config.extra?.['auth0Scheme'] ||
        '${applicationId}';

      config.modResults.contents = addAuth0GradleValues(
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

export const addAuth0AppDelegateCode = (src: string): string => {
  let tempSrc = src;
  // Tests to see if the RCTLinkingManager has already been added
  if (
    !/\[RCTLinkingManager.*application:.*openURL:.*options:.*\]/.test(tempSrc)
  ) {
    tempSrc = mergeContents({
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
    tempSrc = mergeContents({
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

const withIOSAuth0AppDelegate: ConfigPlugin = config => {
  return withAppDelegate(config, config => {
    const src = config.modResults.contents;
    config.modResults.contents = addAuth0AppDelegateCode(src);
    return config;
  });
};

const withIOSAuth0InfoPList: ConfigPlugin = config => {
  return withInfoPlist(config, config => {
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }
    config.modResults.CFBundleURLTypes.push({
      CFBundleURLName: 'auth0',
      CFBundleURLSchemes: [
        process.env.EXPO_AUTH0_SCHEME_IOS ||
          process.env.EXPO_AUTH0_SCHEME ||
          config.extra?.['auth0SchemeIOS'] ||
          config.extra?.['auth0Scheme'] ||
          '$(PRODUCT_BUNDLE_IDENTIFIER)',
      ],
    });
    return config;
  });
};

const withAuth0: ConfigPlugin<void> = config => {
  config = withAndroidAuth0Gradle(config);
  config = withIOSAuth0AppDelegate(config);
  config = withIOSAuth0InfoPList(config);
  return config;
};

export default createRunOncePlugin(withAuth0, pkg.name, pkg.version);
