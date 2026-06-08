/** UTC label for chart tooltips and rows. */
export function formatChartTimeLabel(
  timeMs: number,
  intraday: boolean,
): string {
  if (!intraday) {
    return new Date(timeMs).toISOString().slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(timeMs));
}

export function formatChartAxisTime(timeMs: number, intraday: boolean): string {
  if (!intraday) {
    return new Date(timeMs).toISOString().slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(timeMs));
}
