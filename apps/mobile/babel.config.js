module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    // react-native-reanimated/gesture-handler require this to be listed last
    // if/when reanimated is added. Kept here as the conventional final plugin.
  ],
};
