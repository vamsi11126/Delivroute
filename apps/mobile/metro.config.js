// Metro config for the Expo app inside an npm-workspaces monorepo.
// Without this, Metro resolves the entry point and modules from the repo root
// and fails to find `./index`. See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes in sibling packages are picked up.
// Append to Metro's defaults rather than replacing them, so the project root
// (and any folders Expo watches by default) stay covered. (expo-doctor flags a
// bare `= [workspaceRoot]` as dropping Expo's default watchFolders.)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Resolve modules from the app first, then the hoisted workspace root.
config.resolver.nodeModulesPaths = [
  appNodeModules,
  path.resolve(appNodeModules, 'expo/node_modules'),
  path.resolve(appNodeModules, 'react-native/node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Metro can still walk up to the workspace root for package resolution, which
// is how a second React copy sneaks into the mobile bundle in a monorepo.
// Pin the core runtime packages to the app-local install so hooks always come
// from the same React instance.
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  react: path.resolve(appNodeModules, 'react'),
  'react-native': path.resolve(appNodeModules, 'react-native'),
  'expo-asset': path.resolve(appNodeModules, 'expo/node_modules/expo-asset'),
  '@react-native/virtualized-lists': path.resolve(
    appNodeModules,
    'react-native/node_modules/@react-native/virtualized-lists',
  ),
};

module.exports = config;
