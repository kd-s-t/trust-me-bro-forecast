export const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret !== undefined && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production (min 16 chars)");
  }
  return "dev-auth-secret-min-16";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

async function verifySig(payload: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(fromBase64Url(signature)),
      enc.encode(payload),
    );
  } catch {
    return false;
  }
}

export async function createSessionToken(username: string): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = `${username}:${String(exp)}`;
  const signature = await sign(payload);
  return `${toBase64Url(new TextEncoder().encode(payload))}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  if (token === undefined || token === "") {
    return null;
  }
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let payload: string;
  try {
    payload = new TextDecoder().decode(fromBase64Url(payloadB64));
  } catch {
    return null;
  }
  if (!(await verifySig(payload, signature))) {
    return null;
  }
  const colon = payload.indexOf(":");
  if (colon <= 0) {
    return null;
  }
  const username = payload.slice(0, colon);
  const exp = Number(payload.slice(colon + 1));
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }
  return username;
}

export const sessionMaxAgeSec = SESSION_MAX_AGE_SEC;
