import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  defaultAvatarUrl,
  defaultDisplayName,
  type UserProfile,
} from "@/lib/userProfile";
import { getSql } from "./sql";

function seedEmail(username: string): string | null {
  const key = `USER_${username.toUpperCase()}_EMAIL`;
  const raw = process.env[key]?.trim();
  return raw === undefined || raw === "" ? null : raw;
}

export const SEED_USERS = [
  { username: "kenn", password: "1234", displayName: "Kenn" },
  { username: "john", password: "1234", displayName: "John" },
] as const;

export function seedUsernames(): string[] {
  return SEED_USERS.map((u) => u.username);
}

type UserRow = {
  username: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export async function seedUsers(): Promise<void> {
  const sql = getSql();
  for (const { username, password, displayName } of SEED_USERS) {
    const hash = hashPassword(password);
    const email = seedEmail(username);
    await sql`
      INSERT INTO users (username, password_hash, display_name, email)
      VALUES (${username}, ${hash}, ${displayName}, ${email})
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        display_name = COALESCE(
          NULLIF(TRIM(users.display_name), ''),
          EXCLUDED.display_name
        ),
        email = COALESCE(users.email, EXCLUDED.email)
    `;
  }
}

export async function getUserProfile(
  username: string,
): Promise<UserProfile | null> {
  const normalized = username.trim().toLowerCase();
  if (normalized === "") {
    return null;
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT username, display_name, avatar_url, email
    FROM users
    WHERE username = ${normalized}
    LIMIT 1
  `) as Pick<UserRow, "username" | "display_name" | "avatar_url" | "email">[];

  const row = rows[0];
  if (row === undefined) {
    return null;
  }

  const displayName = row.display_name?.trim();
  const avatarUrl = row.avatar_url?.trim();
  const email = row.email?.trim();

  return {
    username: row.username,
    displayName:
      displayName !== undefined && displayName !== ""
        ? displayName
        : defaultDisplayName(row.username),
    email:
      email !== undefined && email !== "" ? email : null,
    avatarUrl:
      avatarUrl !== undefined && avatarUrl !== ""
        ? avatarUrl
        : defaultAvatarUrl(),
  };
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
  `) as Pick<UserRow, "username" | "password_hash">[];

  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }
  return row.username;
}
