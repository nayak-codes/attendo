const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Step 1: Add .cjs support
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs', 'json'];

// Step 2: Force all @firebase/* packages to use their React Native bundles
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Route any firebase/firestore (ESM or CJS) import → react-native bundle
  if (
    moduleName === '@firebase/firestore' ||
    moduleName.startsWith('@firebase/firestore/')
  ) {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@firebase/firestore/dist/index.rn.js'),
      type: 'sourceFile',
    };
  }

  // Route firebase/app → direct @firebase/app
  if (moduleName === 'firebase/app') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/firebase/app/dist/esm/index.esm.js'),
      type: 'sourceFile',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Step 3: Disable package exports (prevents ESM-only paths from being chosen)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
