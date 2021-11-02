import {
  ConfigPlugin,
  createRunOncePlugin,
  withAppBuildGradle,
  withAppDelegate,
} from '@expo/config-plugins';
import {
  createGeneratedHeaderComment,
  mergeContents,
  MergeResults,
  removeGeneratedContents,
} from '@expo/config-plugins/build/utils/generateCode';

const pkg = require('@sdacunha/react-native-auth0/package.json');

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
  const tag = 'react-native-auth0';
  return mergeContents({
    tag,
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
        process.env.EXPO_AUTH0_SCHEME ||
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

function appendContents(
  src: string,
  newSrc: string,
  tag: string,
  comment: string,
): MergeResults {
  const header = createGeneratedHeaderComment(newSrc, tag, comment);
  if (!src.includes(header)) {
    // Ensure the old generated contents are removed.
    const sanitizedTarget = removeGeneratedContents(src, tag);
    const contentsToAdd = [
      // @something
      header,
      // contents
      newSrc,
      // @end
      `${comment} @generated end ${tag}`,
    ].join('\n');

    return {
      contents: sanitizedTarget ?? src + contentsToAdd,
      didMerge: true,
      didClear: !!sanitizedTarget,
    };
  }
  return {contents: src, didClear: false, didMerge: false};
}

export const addAuth0AppDelegateCode = (src: string): string => {
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

const withIOSAuth0AppDelegate: ConfigPlugin = config => {
  return withAppDelegate(config, config => {
    const src = config.modResults.contents;
    config.modResults.contents = addAuth0AppDelegateCode(src);
    return config;
  });
};

const withAuth0: ConfigPlugin<void> = config => {
  config = withAndroidAuth0Gradle(config);
  config = withIOSAuth0AppDelegate(config);
  return config;
};

export default createRunOncePlugin(withAuth0, pkg.name, pkg.version);
