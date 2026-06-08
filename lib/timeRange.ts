const DAY_MS = 86_400_000;

function assertValidUtcYmd(parts: readonly [number, number, number]): void {
  const [y, m, d] = parts;
  if (y < 1970 || y > 9_999) {
    throw new Error(`Year out of range: ${String(y)}`);
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error(
      `Invalid calendar date parts: ${String(y)}-${String(m)}-${String(d)}`,
    );
  }
  const t = Date.UTC(y, m - 1, d);
  const chk = new Date(t);
  if (
    chk.getUTCFullYear() !== y ||
    chk.getUTCMonth() !== m - 1 ||
    chk.getUTCDate() !== d
  ) {
    throw new Error(`Invalid Gregorian date ${String(y)}-${String(m)}-${String(d)} UTC`);
  }
}

function execYmd(raw: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (m === null) {
    throw new Error(`Date must be YYYY-MM-DD (UTC): ${JSON.stringify(raw)}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) {
    throw new Error(`Date must use integer YYYY-MM-DD: ${JSON.stringify(raw)}`);
  }
  assertValidUtcYmd([y, mo, d]);
  return [y, mo, d];
}

export type UtcDayRangeMs = {
  startMsInclusive: number;
  endMsInclusive: number;
};

export const DEFAULT_CHART_FROM_UTC = "2026-01-01";
export const DEFAULT_CHART_TO_UTC = "2027-12-31";

/** Initial chart viewport (UTC calendar days). */
export const DEFAULT_VISIBLE_FROM_UTC = DEFAULT_CHART_FROM_UTC;
export const DEFAULT_VISIBLE_TO_UTC = DEFAULT_CHART_TO_UTC;

export function defaultVisibleWindowMs(): UtcDayRangeMs {
  return {
    startMsInclusive: parseUtcDayStartMs(DEFAULT_VISIBLE_FROM_UTC),
    endMsInclusive: parseUtcDayEndMsInclusive(DEFAULT_VISIBLE_TO_UTC),
  };
}

/** Last 24 hours for intraday chart zoom. */
export function last24HoursWindowMs(): UtcDayRangeMs {
  const endMsInclusive = Date.now();
  return {
    startMsInclusive: endMsInclusive - 24 * 60 * 60 * 1000,
    endMsInclusive,
  };
}

function parseUtcDayStartMs(day: string): number {
  const [y, mo, d] = execYmd(day);
  return Date.UTC(y, mo - 1, d);
}

function parseUtcDayEndMsInclusive(day: string): number {
  return parseUtcDayStartMs(day) + DAY_MS - 1;
}
