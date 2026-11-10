import { readFileSync } from 'fs';
import { join } from 'path';

import { colors } from '../theme';

// Keeps the theme in sync with the color table in docs/SPEC.md §5.2.
describe('theme colors', () => {
  const spec = readFileSync(join(__dirname, '../../docs/SPEC.md'), 'utf8');
  const rows = [...spec.matchAll(/^\| `(\w+)` \| `(#[0-9A-Fa-f]{6})` \|/gm)];

  it('finds the color table in the spec', () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it.each(rows.map(([, token, hex]) => [token, hex]))('%s matches the spec (%s)', (token, hex) => {
    expect(colors[token as keyof typeof colors]).toBe(hex);
  });
});
