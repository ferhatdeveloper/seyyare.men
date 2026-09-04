module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { "react-runtime": "automatic" }],
    ],
    plugins: [
      "expo-router/babel",
    ],
    parserOpts: {
      // Babel 7.x: ?? ve || karışımına otomatik parantez ekle
      createParenthesizedExpressions: true,
    },
  };
};