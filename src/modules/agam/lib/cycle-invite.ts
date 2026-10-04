import { randomBytes } from "node:crypto";

/** Short URL-safe invite token for cycle registration links. */
export function generateCycleInviteSlug(bytes = 6): string {
  return randomBytes(bytes).toString("base64url");
}

export function cycleInvitePath(slug: string): string {
  return `/agam/apply/${encodeURIComponent(slug)}`;
}

export function cycleInviteAbsoluteUrl(slug: string, origin?: string): string {
  const path = cycleInvitePath(slug);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}
