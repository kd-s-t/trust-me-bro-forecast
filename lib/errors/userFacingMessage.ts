function tryParseOpenAiMessage(raw: string): string {
  const start = raw.indexOf("{");
  if (start < 0) {
    return "";
  }
  try {
    const body = JSON.parse(raw.slice(start)) as {
      error?: { message?: string; code?: string };
    };
    return body.error?.message ?? "";
  } catch {
    return "";
  }
}

/** Short, non-technical copy for sidebar errors. Never surfaces raw JSON or API keys. */
export function userFacingMessage(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "Something went wrong. Try again.";
  }

  let httpStatus: number | null = null;
  const statusMatch = /^OpenAI error \((\d+)\)/i.exec(trimmed);
  if (statusMatch !== null) {
    httpStatus = Number(statusMatch[1]);
  }

  const apiMessage = tryParseOpenAiMessage(trimmed);
  const hay = `${trimmed} ${apiMessage}`.toLowerCase();

  if (
    httpStatus === 401 ||
    hay.includes("invalid_api_key") ||
    hay.includes("incorrect api key")
  ) {
    return "Your OpenAI API key isn’t valid. Update OPENAI_API_KEY in .env and restart the app.";
  }
  if (httpStatus === 429 || hay.includes("rate limit")) {
    return "OpenAI is busy — wait a minute and try again.";
  }
  if (
    httpStatus === 503 ||
    hay.includes("overloaded") ||
    hay.includes("temporarily unavailable")
  ) {
    return "OpenAI is temporarily unavailable. Try again in a bit.";
  }
  if (hay.includes("newsapi") || hay.includes("news api key")) {
    return "Headlines couldn’t be loaded. Check NEWSAPI_API_KEY in .env.";
  }
  if (hay.includes("no bitcoin news") || hay.includes("no headlines")) {
    return "No headlines came back — check NEWSAPI_API_KEY in .env.";
  }
  if (
    trimmed.startsWith("OpenAI error") ||
    (trimmed.includes("{") && trimmed.includes('"error"'))
  ) {
    return "Forecast couldn’t reach OpenAI. Check your API keys in .env.";
  }
  if (trimmed.length > 120 || (trimmed.includes("{") && trimmed.includes("}"))) {
    return "Forecast failed. Check your .env API keys and try again.";
  }

  return trimmed;
}
