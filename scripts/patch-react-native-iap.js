const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, contents, 'utf8');
}

function patchPromiseUtils() {
  const filePath = path.join(
    ROOT,
    'node_modules',
    'react-native-iap',
    'android',
    'src',
    'main',
    'java',
    'com',
    'dooboolab',
    'rniap',
    'PromiseUtlis.kt'
  );

  if (!fs.existsSync(filePath)) {
    console.warn('[patch-react-native-iap] PromiseUtlis.kt not found; skipping.');
    return;
  }

  const original = readFile(filePath);
  if (original.includes('val safeCode = code ?: PromiseUtils.E_UNKNOWN')) {
    return;
  }

  let updated = original;

  updated = updated.replace(
    'import com.facebook.react.bridge.ObjectAlreadyConsumedException\n',
    ''
  );

  updated = updated.replace(
    /catch \(oce: ObjectAlreadyConsumedException\)/g,
    'catch (e: RuntimeException)'
  );

  updated = updated.replace(
    /Already consumed \$\{oce\.message\}/g,
    'Already consumed ${e.message}'
  );

  if (!updated.includes('val safeCode = code ?: PromiseUtils.E_UNKNOWN')) {
    updated = updated.replace(
      /fun Promise\.safeReject\(\s*code: String\?,\s*message: String\?,\s*throwable: Throwable\?,\s*\)\s*\{/m,
      match => `${match}\n    val safeCode = code ?: PromiseUtils.E_UNKNOWN`
    );
    updated = updated.replace(
      'this.reject(code, message, throwable)',
      'this.reject(safeCode, message, throwable)'
    );
  }

  if (updated === original) {
    console.warn(
      '[patch-react-native-iap] PromiseUtlis.kt did not match expected patterns; skipping.'
    );
    return;
  }

  writeFile(filePath, updated);
  console.log('[patch-react-native-iap] Patched PromiseUtlis.kt');
}

function patchRniapModule() {
  const filePath = path.join(
    ROOT,
    'node_modules',
    'react-native-iap',
    'android',
    'src',
    'play',
    'java',
    'com',
    'dooboolab',
    'rniap',
    'RNIapModule.kt'
  );

  if (!fs.existsSync(filePath)) {
    console.warn('[patch-react-native-iap] RNIapModule.kt not found; skipping.');
    return;
  }

  const original = readFile(filePath);
  if (original.includes('val activity = reactApplicationContext.currentActivity')) {
    return;
  }

  const updated = original.replace(
    'val activity = currentActivity',
    'val activity = reactApplicationContext.currentActivity'
  );

  if (updated === original) {
    console.warn(
      '[patch-react-native-iap] RNIapModule.kt did not match expected patterns; skipping.'
    );
    return;
  }

  writeFile(filePath, updated);
  console.log('[patch-react-native-iap] Patched RNIapModule.kt');
}

patchPromiseUtils();
patchRniapModule();
