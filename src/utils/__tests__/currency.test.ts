import { parseDollarsToCents } from '@utils/currency';

describe('parseDollarsToCents', () => {
  it('parses whole dollars', () => {
    expect(parseDollarsToCents('1')).toBe(100);
  });

  it('parses cents', () => {
    expect(parseDollarsToCents('0.1')).toBe(10);
    expect(parseDollarsToCents('0.01')).toBe(1);
  });

  it('parses formatted values', () => {
    expect(parseDollarsToCents('$1.23')).toBe(123);
  });

  it('truncates extra decimals', () => {
    expect(parseDollarsToCents('1.239')).toBe(123);
  });

  it('returns zero for invalid values', () => {
    expect(parseDollarsToCents('')).toBe(0);
    expect(parseDollarsToCents('abc')).toBe(0);
    expect(parseDollarsToCents('1.2.3')).toBe(0);
  });
});
