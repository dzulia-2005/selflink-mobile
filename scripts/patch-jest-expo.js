const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'jest-expo',
  'src',
  'preset',
  'setup.js',
);

const marker =
  "const mockNativeModules = require('react-native/Libraries/BatchedBridge/NativeModules').default;";
try {
  const source = fs.readFileSync(target, 'utf8');
  if (!source.includes(marker)) {
    console.warn('[patch-jest-expo] Unexpected setup.js contents; skipping patch.');
    process.exit(0);
  }
  if (source.includes('NativeUnimoduleProxy = {')) {
    // Patch already applied
    process.exit(0);
  }
  const replacementLine = marker.replace('.default;', '.default || {};');
  const patched = source.replace(
    marker,
    `${replacementLine}\n\nif (!mockNativeModules.NativeUnimoduleProxy) {\n  mockNativeModules.NativeUnimoduleProxy = {\n    modulesConstants: {},\n    viewManagersMetadata: {},\n  };\n}\n\nif (!mockNativeModules.UIManager) {\n  mockNativeModules.UIManager = {\n    RCTView: {\n      directEventTypes: {},\n    },\n  };\n}`,
  );
  fs.writeFileSync(target, patched, 'utf8');
  console.log('[patch-jest-expo] Applied NativeModules guard.');
} catch (error) {
  console.warn('[patch-jest-expo] Failed to apply patch:', error.message);
}
