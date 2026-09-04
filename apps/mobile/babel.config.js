module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "expo-router/babel",
      // Worklets babel plugin (expo-router 6 animasyonları için zorunlu)
      // React Native Worklets paketinden geliyor
      // Native Android modülü olmadan da Babel plugin çalışıyor
      [
        require.resolve("react-native-worklets/plugin"),
        {
          // Native modülü devre dışı (Android Gradle build skip eder)
          disableNative: true,
        },
      ],
    ],
  };
};