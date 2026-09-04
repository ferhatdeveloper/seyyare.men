// Metro config — Nativewind 4.x metro entrypoint yok,
// bu yüzden babel + global.css doğrudan metro'ya tanıtılıyor.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Nativewind CSS'i global.css dosyasından al
config.resolver.assetExts.push("css");

// Nativewind babel preset'i zaten babel.config.js'de var

module.exports = config;