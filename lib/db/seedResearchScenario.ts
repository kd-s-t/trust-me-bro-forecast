import { DEFAULT_HISTORY_SYMBOL } from "@/lib/db/history";
import {
  RESEARCH_SCENARIO_ANALYSIS,
  RESEARCH_SCENARIO_POINTS,
  researchScenarioRunIdForUser,
} from "@/lib/forecast/researchScenario";
import { getSql } from "./sql";

/** Hand-drawn research scenario (2026-06 → 2027-01), one per user. */
export async function seedResearchScenarioForecast(
  username: string,
): Promise<void> {
  const sql = getSql();
  const user = username.trim().toLowerCase();
  const runId = researchScenarioRunIdForUser(user);
  const first = RESEARCH_SCENARIO_POINTS[0]!;
  const last = RESEARCH_SCENARIO_POINTS[RESEARCH_SCENARIO_POINTS.length - 1]!;

  await sql`
    INSERT INTO forecast_runs (
      id,
      username,
      symbol,
      horizon,
      start_time_ms,
      end_time_ms,
      start_price,
      analysis,
      news_payload,
      created_at
    ) VALUES (
      ${runId},
      ${user},
      ${DEFAULT_HISTORY_SYMBOL},
      ${"1y"},
      ${first.timeMs},
      ${last.timeMs},
      ${first.price},
      ${RESEARCH_SCENARIO_ANALYSIS},
      ${sql.json([])},
      ${"2026-01-01T00:00:00.000Z"}
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      symbol = EXCLUDED.symbol,
      horizon = EXCLUDED.horizon,
      start_time_ms = EXCLUDED.start_time_ms,
      end_time_ms = EXCLUDED.end_time_ms,
      start_price = EXCLUDED.start_price,
      analysis = EXCLUDED.analysis,
      news_payload = EXCLUDED.news_payload,
      created_at = EXCLUDED.created_at
  `;

  await sql`
    DELETE FROM forecast
    WHERE forecast_run_id = ${runId}
  `;

  await sql`
    INSERT INTO forecast ${sql(
      RESEARCH_SCENARIO_POINTS.map((p) => ({
        forecast_run_id: runId,
        time_ms: p.timeMs,
        price: p.price,
      })),
    )}
  `;
}
