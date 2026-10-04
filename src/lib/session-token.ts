import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_SECRET = "dev-only-leadhaus-secret-change-me";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  // Refuse to run a deployed server with a guessable secret.
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) throw new Error("SESSION_SECRET must be set in production. See .env.example.");
  return DEV_SECRET;
}

export function sign(userId: string) {
  const mac = createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const userId = token.slice(0, i);
  const a = Buffer.from(token);
  const b = Buffer.from(sign(userId));
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}
