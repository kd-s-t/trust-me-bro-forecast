import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
] as const;

export function getDatabaseUrl(): string {
  for (const key of DATABASE_ENV_KEYS) {
    const url = process.env[key]?.trim();
    if (url !== undefined && url !== "") return url;
  }

  const hint =
    process.env.VERCEL === "1"
      ? "In Vercel: Project → Settings → Environment Variables → add DATABASE_URL (your hosted Postgres URL). Enable Production, then redeploy."
      : "Add DATABASE_URL to .env (see .env.example).";

  throw new Error(`DATABASE_URL is not set. ${hint}`);
}

export function getSql(): ReturnType<typeof postgres> {
  if (client === undefined) {
    client = postgres(getDatabaseUrl(), {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    });
  }
  return client;
}

export async function closeSql(): Promise<void> {
  if (client !== undefined) {
    await client.end({ timeout: 5 });
    client = undefined;
  }
}
