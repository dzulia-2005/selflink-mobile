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
  const possibleFiles = ['PromiseUtils.kt', 'PromiseUtlis.kt'];
  const basePath = path.join(
    ROOT,
    'node_modules',
    'react-native-iap',
    'android',
    'src',
    'main',
    'java',
    'com',
    'dooboolab',
    'rniap'
  );

  const existingFiles = possibleFiles
    .map(fileName => path.join(basePath, fileName))
    .filter(filePath => fs.existsSync(filePath));

  if (existingFiles.length === 0) {
    console.warn(
      '[patch-react-native-iap] PromiseUtils.kt/PromiseUtlis.kt not found; skipping.'
    );
    return;
  }

  existingFiles.forEach(filePath => {
    const original = readFile(filePath);

    const importPattern =
      'import com.facebook.react.bridge.ObjectAlreadyConsumedException\n';
    const catchPattern = /catch \(oce: ObjectAlreadyConsumedException\)/g;
    const messagePattern = /Already consumed \$\{oce\.message\}/g;
    const safeRejectPattern =
      /fun Promise\.safeReject\(\s*code: String\?,\s*message: String\?,\s*throwable: Throwable\?,\s*\)\s*\{/m;
    const rejectPattern = /this\.reject\(code, message, throwable\)/g;

    let updated = original;

    if (updated.includes(importPattern)) {
      updated = updated.replace(importPattern, '');
    }

    if (catchPattern.test(updated)) {
      updated = updated.replace(catchPattern, 'catch (e: RuntimeException)');
    }

    if (messagePattern.test(updated)) {
      updated = updated.replace(messagePattern, 'Already consumed ${e.message}');
    }

    const hasSafeCode = updated.includes('val safeCode = code ?: PromiseUtils.E_UNKNOWN');
    if (!hasSafeCode && safeRejectPattern.test(updated)) {
      updated = updated.replace(
        safeRejectPattern,
        match => `${match}\n    val safeCode = code ?: PromiseUtils.E_UNKNOWN`
      );
    }

    const safeCodePresent = updated.includes('val safeCode = code ?: PromiseUtils.E_UNKNOWN');
    if (safeCodePresent && rejectPattern.test(updated)) {
      updated = updated.replace(rejectPattern, 'this.reject(safeCode, message, throwable)');
    }

    if (updated === original) {
      console.log(
        `[patch-react-native-iap] ${path.basename(
          filePath
        )} already compatible; no patch needed.`
      );
      return;
    }

    writeFile(filePath, updated);
    console.log(`[patch-react-native-iap] Patched ${path.basename(filePath)}`);
  });
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
    console.log('[patch-react-native-iap] RNIapModule.kt already compatible; no patch needed.');
    return;
  }

  if (!original.includes('val activity = currentActivity')) {
    console.log('[patch-react-native-iap] RNIapModule.kt already compatible; no patch needed.');
    return;
  }

  const updated = original.replace(
    'val activity = currentActivity',
    'val activity = reactApplicationContext.currentActivity'
  );

  writeFile(filePath, updated);
  console.log('[patch-react-native-iap] Patched RNIapModule.kt');
}

patchPromiseUtils();
patchRniapModule();
