/** Money is always an integer number of pesos (never a float). */

/** `3000` → `"3.000"`: dot as thousands separator. */
export function formatThousands(value: number): string {
  return String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `3000` → `"$ 3.000"`. Argentine format: dot as thousands separator, no decimals. */
export function formatMoney(pesos: number): string {
  if (!Number.isInteger(pesos)) throw new Error(`Money must be an integer, got ${pesos}`);
  const sign = pesos < 0 ? '-' : '';
  return `${sign}$ ${formatThousands(pesos)}`;
}

/** What the rate input shows while typing: `"3500"` → `"3.500"`, `""` → `""`. */
export function formatRateInput(input: string): string {
  const digits = digitsOnly(input).replace(/^0+(?=\d)/, '').slice(0, 7);
  return digits === '' ? '' : formatThousands(Number(digits));
}

/** Only digits, for the numeric rate input: `"$ 3.500"` → `"3500"`. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Parses what the user typed in the rate input (`"3.500"`, `"$ 3500"`).
 * Returns null when it is not a valid rate (business rule 11: integer > 0).
 */
export function parseRate(input: string): number | null {
  const digits = digitsOnly(input);
  if (digits === '' || digits.length > 9) return null;
  const value = Number(digits);
  return isValidRate(value) ? value : null;
}

export function isValidRate(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
