type ContextWindow = {
  startMs: number;
  endMs: number;
  lines: string[];
};

const WINDOWS: ContextWindow[] = [
  {
    startMs: Date.UTC(2017, 4, 1),
    endMs: Date.UTC(2018, 2, 1),
    lines: [
      "Retail influx + relentless media coverage brought marginal buyers; leverage amplified swings.",
      "Regulated cash-settled BTC futures listed in the U.S. in Dec 2017 (CBOE/CME), widening who could trade the narrative.",
      "The ICO boom often ran through BTC (and ETH) on-ramps, stacking concurrent fiat demand.",
      "Backdrop only: not a deterministic explanation for any single day’s candle.",
    ],
  },
  {
    startMs: Date.UTC(2020, 9, 1),
    endMs: Date.UTC(2022, 5, 1),
    lines: [
      "Macro: coordinated stimulus and low rates boosted risk appetite; BTC rode the same liquidity wave as growth assets.",
      "Corporate treasuries and funds marketed crypto baskets while futures depth improved execution for larger tickets.",
      "Mid-2020 halving tightened new issuance while crowded leverage in perps amplified both directions.",
    ],
  },
];

export function contextLinesForTimeMs(timeMs: number): string[] {
  for (const w of WINDOWS) {
    if (timeMs >= w.startMs && timeMs < w.endMs) {
      return w.lines;
    }
  }
  return [];
}
