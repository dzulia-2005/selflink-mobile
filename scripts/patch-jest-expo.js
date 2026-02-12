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

const markerRegex =
  /const\s+mockNativeModules\s*=\s*require\(['"]react-native\/Libraries\/BatchedBridge\/NativeModules['"]\)(?:\.default)?(?:\s*\|\|\s*\{\s*\})?\s*;/;
try {
  const source = fs.readFileSync(target, 'utf8');
  const markerMatch = source.match(markerRegex);
  if (!markerMatch) {
    console.warn('[patch-jest-expo] Unexpected setup.js contents; skipping patch.');
    process.exit(0);
  }
  const markerLine = markerMatch[0];
  const hasFallback = markerLine.includes('|| {}');
  const hasUnimoduleGuard =
    source.includes('mockNativeModules.NativeUnimoduleProxy = {') ||
    source.includes('NativeUnimoduleProxy = {');
  const hasUiManagerGuard = source.includes('mockNativeModules.UIManager = {');
  const needsUnimoduleGuard = !hasUnimoduleGuard;
  const needsUiManagerGuard = !hasUiManagerGuard;

  if (hasFallback && !needsUnimoduleGuard && !needsUiManagerGuard) {
    console.log('[patch-jest-expo] setup.js already compatible; no patch needed.');
    process.exit(0);
  }

  const replacementLine = hasFallback
    ? markerLine
    : markerLine.includes('.default')
      ? markerLine.replace('.default', '.default || {}')
      : markerLine.replace(/;$/, ' || {};');

  const guardBlocks = [
    needsUnimoduleGuard
      ? "if (!mockNativeModules.NativeUnimoduleProxy) {\n  mockNativeModules.NativeUnimoduleProxy = {\n    modulesConstants: {},\n    viewManagersMetadata: {},\n  };\n}\n"
      : '',
    needsUiManagerGuard
      ? "if (!mockNativeModules.UIManager) {\n  mockNativeModules.UIManager = {\n    RCTView: {\n      directEventTypes: {},\n    },\n  };\n}\n"
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const patched = source.replace(markerRegex, `${replacementLine}\n\n${guardBlocks}`.trim());
  fs.writeFileSync(target, patched, 'utf8');
  console.log('[patch-jest-expo] Applied NativeModules guard.');
} catch (error) {
  console.warn('[patch-jest-expo] Failed to apply patch:', error.message);
}
