import { shortUpdateId, shortVersion } from '../version';

describe('shortVersion', () => {
  it.each([
    ['1.0.0', '1.0'],
    ['1.2.0', '1.2'],
    ['1.2.3', '1.2.3'],
    ['2.0', '2.0'],
  ])('%s → %s', (input, expected) => {
    expect(shortVersion(input)).toBe(expected);
  });
});

describe('shortUpdateId', () => {
  it('keeps the first 8 hex characters', () => {
    expect(shortUpdateId('0f2a9c1e-77b4-4d3e-9a61-5c2b8e7d1f00')).toBe('0f2a9c1e');
  });

  it('returns null without an update (embedded bundle)', () => {
    expect(shortUpdateId(null)).toBeNull();
    expect(shortUpdateId(undefined)).toBeNull();
  });
});
