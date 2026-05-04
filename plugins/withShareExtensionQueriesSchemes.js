const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist');
const { withDangerousMod } = require('expo/config-plugins');
const { getShareExtensionName } = require('expo-share-extension/plugin/build/index.js');

/**
 * Adds LSApplicationQueriesSchemes to the share extension Info.plist so
 * Linking / canOpenURL from the extension can see the host app schemes.
 * Runs after expo-share-extension has written ios/<...>ShareExtension/Info.plist.
 */
function withShareExtensionQueriesSchemes(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const extFolder = getShareExtensionName(cfg);
      const plistPath = path.join(root, extFolder, 'Info.plist');
      if (!fs.existsSync(plistPath)) {
        return cfg;
      }
      const obj = plist.parse(fs.readFileSync(plistPath, 'utf8'));
      const scheme =
        typeof cfg.scheme === 'string'
          ? cfg.scheme
          : Array.isArray(cfg.scheme)
            ? cfg.scheme[0]
            : 'subradax';
      const extra = [scheme, cfg.slug ? `exp+${cfg.slug}` : null, cfg.ios?.bundleIdentifier].filter(Boolean);
      const set = new Set([...(obj.LSApplicationQueriesSchemes || []), ...extra]);
      obj.LSApplicationQueriesSchemes = [...set];
      fs.writeFileSync(plistPath, plist.build(obj));
      return cfg;
    },
  ]);
}

module.exports = withShareExtensionQueriesSchemes;
