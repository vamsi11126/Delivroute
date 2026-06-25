// Metro config for the Expo app inside an npm-workspaces monorepo.
// Without this, Metro resolves the entry point and modules from the repo root
// and fails to find `./index`. See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes in sibling packages are picked up.
// Append to Metro's defaults rather than replacing them, so the project root
// (and any folders Expo watches by default) stay covered. (expo-doctor flags a
// bare `= [workspaceRoot]` as dropping Expo's default watchFolders.)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Resolve modules from the app first, then the hoisted workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
