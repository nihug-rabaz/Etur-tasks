import { createHmac, timingSafeEqual } from "node:crypto";
import { Env } from "@/lib/env";

export type PendingAssistantAction = {
  id: string;
  userId: string;
  name: string;
  args: Record<string, unknown>;
  label: string;
  createdAt: number;
  href?: string;
  severity?: "normal" | "destructive";
};

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  return (
    Env.get("ASSISTANT_PENDING_SECRET") ||
    Env.get("NEXTAUTH_SECRET") ||
    "etur-assistant-dev-secret"
  );
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const raw = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(raw, "base64");
}

function sign(payloadB64: string): string {
  return b64url(createHmac("sha256", secret()).update(payloadB64).digest());
}

export class AssistantPendingStore {
  /** Returns a signed token (used as toolCallId across serverless instances). */
  public static put(action: PendingAssistantAction): string {
    const payload = b64url(JSON.stringify(action));
    return `${payload}.${sign(payload)}`;
  }

  public static take(token: string, userId: string): PendingAssistantAction | null {
    const item = this.peek(token, userId);
    // Stateless token: "take" is verify-only; replay window is TTL + one-shot UX.
    return item;
  }

  public static peek(token: string, userId: string): PendingAssistantAction | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    if (!payloadB64 || !sig) return null;
    const expected = sign(payloadB64);
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    } catch {
      return null;
    }
    try {
      const json = fromB64url(payloadB64).toString("utf8");
      const action = JSON.parse(json) as PendingAssistantAction;
      if (action.userId !== userId) return null;
      if (Date.now() - action.createdAt > TTL_MS) return null;
      return action;
    } catch {
      return null;
    }
  }
}
