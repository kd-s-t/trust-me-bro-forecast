import { createHash } from "node:crypto";

/** Restored from `forecast/research_scenario_through_2027_01.json` (git bd64223). */
export const RESEARCH_SCENARIO_RUN_ID = "a1111111-1111-4111-8111-111111111111";

/** Stable research-scenario run id per user (kenn keeps legacy id). */
export function researchScenarioRunIdForUser(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (normalized === "kenn") {
    return RESEARCH_SCENARIO_RUN_ID;
  }
  const hash = createHash("sha256")
    .update(`tmbf-research:${normalized}`)
    .digest("hex");
  const variant = ((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${variant}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

export function isResearchScenarioRunId(
  runId: string,
  username: string,
): boolean {
  return runId === researchScenarioRunIdForUser(username);
}

export type ResearchScenarioPoint = {
  timeMs: number;
  price: number;
  note?: string;
};

export const RESEARCH_SCENARIO_POINTS: readonly ResearchScenarioPoint[] = [
  { timeMs: 1781049600000, price: 80250 },
  { timeMs: 1781654400000, price: 82668.57 },
  { timeMs: 1782259200000, price: 84183.55 },
  { timeMs: 1782864000000, price: 84531.99 },
  { timeMs: 1783468800000, price: 84372.12 },
  { timeMs: 1784073600000, price: 84794.99 },
  { timeMs: 1784678400000, price: 86482.07 },
  { timeMs: 1785283200000, price: 89158.68 },
  { timeMs: 1785888000000, price: 91780.92 },
  { timeMs: 1786492800000, price: 93331.46 },
  { timeMs: 1787097600000, price: 93618.39 },
  { timeMs: 1787702400000, price: 93450.8 },
  { timeMs: 1788307200000, price: 94034.51 },
  { timeMs: 1788912000000, price: 96038.62 },
  { timeMs: 1789516800000, price: 99054.83 },
  { timeMs: 1790121600000, price: 101885.57 },
  { timeMs: 1790726400000, price: 103459.68 },
  { timeMs: 1791331200000, price: 103676.55 },
  { timeMs: 1791936000000, price: 103514.45 },
  { timeMs: 1792540800000, price: 104295.97 },
  { timeMs: 1793145600000, price: 106661.42 },
  { timeMs: 1793750400000, price: 110046.41 },
  { timeMs: 1794355200000, price: 113088.56 },
  { timeMs: 1794960000000, price: 114672.23 },
  { timeMs: 1795564800000, price: 114811.19 },
  { timeMs: 1796169600000, price: 114671.99 },
  { timeMs: 1796774400000, price: 115694.08 },
  { timeMs: 1797379200000, price: 118469.37 },
  { timeMs: 1797984000000, price: 122252.87 },
  { timeMs: 1798588800000, price: 125507.09 },
  { timeMs: 1799193600000, price: 127084.27 },
  { timeMs: 1799798400000, price: 127138.59 },
  { timeMs: 1800403200000, price: 127044.65 },
  {
    timeMs: 1801008000000,
    price: 128356.46,
    note: "Scenario peak (hand-drawn, not live data): after a flat late-2026 stretch near six figures, this is the final continuation leg—steady spot/ETF-style demand, no prolonged risk-off break. Endpoint of the exercise, not a price target.",
  },
] as const;

export const RESEARCH_SCENARIO_ANALYSIS =
  RESEARCH_SCENARIO_POINTS[RESEARCH_SCENARIO_POINTS.length - 1]!.note ??
  "Research scenario through 2027-01 (hand-drawn exercise, not a price target).";
