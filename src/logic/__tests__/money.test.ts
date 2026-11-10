import { digitsOnly, formatMoney, formatRateInput, isValidRate, parseRate } from '../money';

describe('formatMoney', () => {
  it.each([
    [0, '$ 0'],
    [500, '$ 500'],
    [3000, '$ 3.000'],
    [45000, '$ 45.000'],
    [117000, '$ 117.000'],
    [1234567, '$ 1.234.567'],
    [-3000, '-$ 3.000'],
  ])('%d → %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it('refuses floats', () => {
    expect(() => formatMoney(3000.5)).toThrow();
  });
});

describe('parseRate', () => {
  it.each([
    ['3000', 3000],
    ['3.000', 3000],
    ['$ 3.500', 3500],
    [' 4500 ', 4500],
  ])('%p → %p', (input, expected) => {
    expect(parseRate(input)).toBe(expected);
  });

  it.each(['', '0', '000', '$ ', 'abc', '1234567890'])('rejects %p', (input) => {
    expect(parseRate(input)).toBeNull();
  });
});

describe('digitsOnly / isValidRate', () => {
  it('keeps only digits', () => {
    expect(digitsOnly('$ 3.000,50')).toBe('300050');
  });

  it('accepts only positive integers', () => {
    expect(isValidRate(1)).toBe(true);
    expect(isValidRate(0)).toBe(false);
    expect(isValidRate(-5)).toBe(false);
    expect(isValidRate(2.5)).toBe(false);
  });
});

describe('formatRateInput', () => {
  it.each([
    ['', ''],
    ['3', '3'],
    ['3000', '3.000'],
    ['3.5000', '35.000'],
    ['$ 4500', '4.500'],
    ['0045', '45'],
    ['0', '0'],
    ['123456789', '1.234.567'],
  ])('%p → %p', (input, expected) => {
    expect(formatRateInput(input)).toBe(expected);
  });
});
