const {
  withAppDelegate,
  withInfoPlist,
  withEntitlementsPlist,
} = require('expo/config-plugins');

// SDK 57 includes Expo's scene runtime, but its template still uses AppDelegate
// startup. iOS 27 requires scene startup. Keep the fix across Expo prebuilds.
module.exports = function withIOSSceneSupport(config) {
  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('CareQueue scene support requires the Swift Expo AppDelegate.');
    }
    let source = mod.modResults.contents;
    if (!source.includes('ExpoReactNativeFactoryProvider')) {
      const declaration = 'class AppDelegate: ExpoAppDelegate {';
      if (!source.includes(declaration)) {
        throw new Error('Review the custom AppDelegate before enabling scene support.');
      }
      source = source.replace(declaration,
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }
    source = source.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\s*/,
      '// ExpoAppSceneDelegate creates the window and starts React Native.\n    '
    );
    if (source.includes('factory.startReactNative(')) {
      throw new Error('Review custom React Native startup before enabling scene support.');
    }
    if (!source.includes('?? RCTBundleURLProvider')) {
      source = source.replace(
        'return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")',
        'return Bundle.main.url(forResource: "main", withExtension: "jsbundle")\n'
          + '      ?? RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")'
      );
    }
    mod.modResults.contents = source;
    return mod;
  });
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
        }],
      },
    };
    return mod;
  });
  // Only local free-account testing omits APNs; other builds keep push support.
  if (process.env.CAREQUEUE_IOS_PERSONAL_TEAM === '1') {
    config = withEntitlementsPlist(config, (mod) => {
      delete mod.modResults['aps-environment'];
      return mod;
    });
  }
  return config;
};
