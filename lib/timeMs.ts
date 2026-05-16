/** Normalize epoch seconds or milliseconds to milliseconds. */
export function normalizeTimeMs(v: number): number {
  const iv = Math.floor(v);
  if (iv >= 1_000_000_000_000) {
    return iv;
  }
  if (iv >= 1_000_000_000) {
    return iv * 1000;
  }
  throw new Error(`Unrecognized time scale: ${String(v)}`);
}
