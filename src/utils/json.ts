const BIG_INT_LENGTH = 16;

const isDigit = (char: string) => char >= '0' && char <= '9';

function wrapLargeIntegers(payload: string): string {
  let result = '';
  let index = 0;
  let inString = false;
  let escape = false;

  while (index < payload.length) {
    const char = payload[index];

    if (inString) {
      result += char;
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      index += 1;
      continue;
    }

    if (char === '-' || isDigit(char)) {
      let token = char;
      let cursor = index + 1;
      let hasDecimal = false;
      let hasExponent = false;

      while (cursor < payload.length) {
        const nextChar = payload[cursor];
        if (isDigit(nextChar)) {
          token += nextChar;
          cursor += 1;
          continue;
        }
        if (!hasDecimal && nextChar === '.') {
          hasDecimal = true;
          token += nextChar;
          cursor += 1;
          continue;
        }
        if (!hasExponent && (nextChar === 'e' || nextChar === 'E')) {
          hasExponent = true;
          token += nextChar;
          cursor += 1;
          if (
            cursor < payload.length &&
            (payload[cursor] === '+' || payload[cursor] === '-')
          ) {
            token += payload[cursor];
            cursor += 1;
          }
          continue;
        }
        break;
      }

      const digitsOnly = token.replace(/[^0-9]/g, '');
      const needsWrapping =
        !hasDecimal && !hasExponent && digitsOnly.length >= BIG_INT_LENGTH;

      result += needsWrapping ? `"${token}"` : token;
      index = cursor;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

export function parseJsonPreservingLargeInts<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null as T;
  }
  const normalized = wrapLargeIntegers(trimmed);
  return JSON.parse(normalized) as T;
}
