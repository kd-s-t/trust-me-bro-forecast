import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSql } from "./sql";

const SEED_USERS = [
  { username: "kenn", password: "1234" },
  { username: "john", password: "1234" },
] as const;

type UserRow = {
  username: string;
  password_hash: string;
};

export async function seedUsers(): Promise<void> {
  const sql = getSql();
  for (const { username, password } of SEED_USERS) {
    const hash = hashPassword(password);
    await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${hash})
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash
    `;
  }
}

export async function verifyUserCredentials(
  username: string,
  password: string,
): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (normalized === "") {
    return null;
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT username, password_hash
    FROM users
    WHERE username = ${normalized}
    LIMIT 1
  `) as UserRow[];

  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }
  return row.username;
}
