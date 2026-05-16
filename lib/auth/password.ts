import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const colon = stored.indexOf(":");
  if (colon <= 0) {
    return false;
  }
  const saltHex = stored.slice(0, colon);
  const hashHex = stored.slice(colon + 1);
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LEN) {
    return false;
  }
  const actual = scryptSync(password, salt, KEY_LEN);
  return timingSafeEqual(expected, actual);
}
