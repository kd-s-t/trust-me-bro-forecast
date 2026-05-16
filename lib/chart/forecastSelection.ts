/** Selected forecast run for the chart (client-only). */
export const FORECAST_SELECT_EVENT = "chart:forecast-select";

let selectedRunId: string | null = null;

export function getSelectedForecastRunId(): string | null {
  return selectedRunId;
}

export function setSelectedForecastRunId(runId: string | null): void {
  if (selectedRunId === runId) {
    return;
  }
  selectedRunId = runId;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FORECAST_SELECT_EVENT, { detail: { runId } }),
    );
  }
}
