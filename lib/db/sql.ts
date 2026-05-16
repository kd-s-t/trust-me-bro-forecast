import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url === undefined || url === "") {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres URL to .env (see .env.example).",
    );
  }
  return url;
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
