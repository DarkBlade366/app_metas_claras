const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite (web) imports `wa-sqlite.wasm`; Metro no lo resuelve por defecto.
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'wasm'])];

module.exports = config;