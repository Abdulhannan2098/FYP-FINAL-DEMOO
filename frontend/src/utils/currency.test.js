import { formatPKR } from '../utils/currency.js';

describe('formatPKR', () => {
  it('formats valid numbers correctly', () => {
    expect(formatPKR(1000)).toBe('PKR 1,000.00');
    expect(formatPKR(1234.56)).toBe('PKR 1,234.56');
    expect(formatPKR(0)).toBe('PKR 0.00');
    expect(formatPKR(100)).toBe('PKR 100.00');
  });

  it('handles string numbers', () => {
    expect(formatPKR('1000')).toBe('PKR 1,000.00');
    expect(formatPKR('1234.56')).toBe('PKR 1,234.56');
  });

  it('handles invalid inputs', () => {
    expect(formatPKR(null)).toBe('PKR 0.00');
    expect(formatPKR(undefined)).toBe('PKR 0.00');
    expect(formatPKR(NaN)).toBe('PKR 0.00');
    expect(formatPKR(Infinity)).toBe('PKR 0.00');
    expect(formatPKR('invalid')).toBe('PKR 0.00');
  });
});