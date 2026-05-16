import type { ForecastRun } from "@/lib/db/forecast";
import {
  loadForecastPointsByRunId,
  loadLatestForecastPoints,
  type ForecastRunSummary,
} from "@/lib/db/forecast";
import { DEFAULT_HISTORY_SYMBOL } from "@/lib/db/history";
import type { PricePoint } from "@/lib/history";
import { formatHorizonLabel } from "@/lib/forecast/horizons";
import { isResearchScenarioRunId } from "@/lib/forecast/researchScenario";

export type ForecastApiPayload = {
  runId: string;
  horizon: string;
  analysis: string;
  createdAt: string;
  points: PricePoint[];
  insightLabel: string;
};

export type ForecastRunListItem = ForecastRunSummary & {
  label: string;
};

function buildInsightLabel(
  run: ForecastRun,
  points: PricePoint[],
  username: string,
): string {
  const headlines = run.newsArticles
    .slice(0, 3)
    .map((a) => a.title)
    .join(" · ");
  const kind = isResearchScenarioRunId(run.id, username)
    ? "Research scenario"
    : run.analysis.startsWith("News outlook")
      ? "News outlook"
      : "AI forecast";
  return [
    `${kind} · ${formatHorizonLabel(run.horizon)}`,
    headlines !== ""
      ? headlines.slice(0, 100)
      : (points.at(-1)?.note ?? run.analysis).slice(0, 100),
  ].join(" · ");
}

function toPayload(
  data: { run: ForecastRun; points: PricePoint[] },
  username: string,
): ForecastApiPayload {
  return {
    runId: data.run.id,
    horizon: data.run.horizon,
    analysis: data.run.analysis,
    createdAt: data.run.createdAt,
    points: data.points,
    insightLabel: buildInsightLabel(data.run, data.points, username),
  };
}

export function formatForecastRunLabel(
  run: ForecastRunSummary,
  username: string,
): string {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(run.createdAt));
  const horizon = formatHorizonLabel(run.horizon);
  if (isResearchScenarioRunId(run.id, username)) {
    return `Research scenario · ${date}`;
  }
  const snippet = run.analysis.trim();
  if (snippet.length > 0) {
    const short =
      snippet.length > 36 ? `${snippet.slice(0, 36)}…` : snippet;
    return `${horizon} · ${date} · ${short}`;
  }
  return `${horizon} · ${date}`;
}

export async function loadForecastPayload(
  username: string,
  runId?: string | null,
): Promise<ForecastApiPayload | null> {
  const user = username.trim().toLowerCase();
  const data =
    runId !== undefined && runId !== null && runId !== ""
      ? await loadForecastPointsByRunId(runId, user)
      : await loadLatestForecastPoints(user, DEFAULT_HISTORY_SYMBOL);
  if (data === null) {
    return null;
  }
  return toPayload(data, user);
}

export async function loadForecastRunList(
  username: string,
): Promise<ForecastRunListItem[]> {
  const { listForecastRuns } = await import("@/lib/db/forecast");
  const user = username.trim().toLowerCase();
  const runs = await listForecastRuns(user, DEFAULT_HISTORY_SYMBOL);
  return runs.map((run) => ({
    ...run,
    label: formatForecastRunLabel(run, user),
  }));
}
