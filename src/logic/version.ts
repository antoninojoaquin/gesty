/** `"1.0.0"` → `"1.0"`, `"1.2.0"` → `"1.2"`, `"1.2.3"` → `"1.2.3"` (footer in Ajustes). */
export function shortVersion(version: string): string {
  const parts = version.split('.');
  while (parts.length > 2 && parts[parts.length - 1] === '0') parts.pop();
  return parts.join('.');
}

/** First 8 characters of an OTA update id, enough to tell versions apart. */
export function shortUpdateId(updateId: string | null | undefined): string | null {
  return updateId ? updateId.replace(/-/g, '').slice(0, 8) : null;
}
