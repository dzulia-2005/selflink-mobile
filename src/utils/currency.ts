export const parseDollarsToCents = (raw: string) => {
  const normalized = raw.replace(/[^0-9.]/g, '');
  if (!normalized) {
    return 0;
  }
  const parts = normalized.split('.');
  if (parts.length > 2) {
    return 0;
  }
  const [wholeRaw = '0', decimalRaw = ''] = parts;
  const whole = Number(wholeRaw || '0');
  const decimal = Number(decimalRaw.padEnd(2, '0').slice(0, 2) || '0');
  if (Number.isNaN(whole) || Number.isNaN(decimal)) {
    return 0;
  }
  return whole * 100 + decimal;
};
