import { addressKey, suggestAddresses, type AddressUsage } from '../suggestions';

const usage: AddressUsage[] = [
  { address: 'Belgrano 1450', count: 5, lastUsedAt: 100 },
  { address: 'Belgrano 900', count: 2, lastUsedAt: 300 },
  { address: 'San Martín 820', count: 7, lastUsedAt: 200 },
  { address: 'san martin 820', count: 1, lastUsedAt: 400 },
  { address: 'Rivadavia 1132', count: 3, lastUsedAt: 50 },
  { address: 'Mitre 315, dto 2', count: 1, lastUsedAt: 10 },
];

describe('addressKey', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(addressKey('  San   Martín 820 ')).toBe('san martin 820');
  });
});

describe('suggestAddresses', () => {
  it('needs at least 2 characters', () => {
    expect(suggestAddresses('', usage)).toEqual([]);
    expect(suggestAddresses('b', usage)).toEqual([]);
    expect(suggestAddresses(' b ', usage)).toEqual([]);
  });

  it('matches anywhere in the address, ordered by frequency', () => {
    expect(suggestAddresses('be', usage)).toEqual([
      { address: 'Belgrano 1450', count: 5 },
      { address: 'Belgrano 900', count: 2 },
    ]);
    expect(suggestAddresses('1450', usage)).toEqual([{ address: 'Belgrano 1450', count: 5 }]);
  });

  it('merges spellings and shows the most used one', () => {
    expect(suggestAddresses('martin', usage)).toEqual([{ address: 'San Martín 820', count: 8 }]);
  });

  it('returns at most 3 suggestions', () => {
    const wide: AddressUsage[] = ['Calle 1', 'Calle 2', 'Calle 3', 'Calle 4'].map((address, i) => ({
      address,
      count: i + 1,
      lastUsedAt: i,
    }));
    expect(suggestAddresses('calle', wide).map((s) => s.address)).toEqual(['Calle 4', 'Calle 3', 'Calle 2']);
  });

  it('breaks frequency ties by most recent use', () => {
    const tied: AddressUsage[] = [
      { address: 'Calle A', count: 2, lastUsedAt: 1 },
      { address: 'Calle B', count: 2, lastUsedAt: 9 },
    ];
    expect(suggestAddresses('calle', tied).map((s) => s.address)).toEqual(['Calle B', 'Calle A']);
  });
});
