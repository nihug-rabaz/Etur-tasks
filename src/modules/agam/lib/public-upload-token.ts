import { createHmac, timingSafeEqual } from "node:crypto";
import { Env } from "@/lib/env";

const TOKEN_TTL_MS = 30 * 60 * 1000;

function secret(): string {
  return Env.get("NEXTAUTH_SECRET") ?? Env.get("AUTH_SECRET") ?? "dev-fallback-change-me";
}

function signPayload(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPublicUploadToken(candidateId: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${candidateId}:${expiresAt}`;
  return `${expiresAt}.${signPayload(payload)}`;
}

export function verifyPublicUploadToken(candidateId: string, token: string): boolean {
  const [expiresRaw, signature] = token.split(".");
  if (!expiresRaw || !signature) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = signPayload(`${candidateId}:${expiresAt}`);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
