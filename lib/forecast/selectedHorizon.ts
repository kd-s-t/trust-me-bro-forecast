import type { ForecastHorizon } from "./horizons";

let selectedHorizon: ForecastHorizon = "3m";

export function getSelectedForecastHorizon(): ForecastHorizon {
  return selectedHorizon;
}

export function setSelectedForecastHorizon(horizon: ForecastHorizon): void {
  selectedHorizon = horizon;
}
