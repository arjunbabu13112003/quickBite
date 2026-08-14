const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude build artifacts, CMake outputs (.cxx), and temporary directories from Metro's file watcher
config.resolver.blockList = [
  /[\\/]android[\\/]\.cxx[\\/]/,
  /[\\/]react-native-screens[\\/]android[\\/]\.cxx[\\/]/,
  /[\\/]react-native-screens[\\/]android[\\/]build[\\/]/,
  /.*\.cxx$/,
];

module.exports = config;
