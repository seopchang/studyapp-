const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK가 요구하는 Node.js 전용 모듈을 React Native 환경에서 무시
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
