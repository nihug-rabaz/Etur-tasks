import path from "node:path";
import type { ModuleAccessContext } from "@/shared/modules/types";

export type ApiHttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

const MAX_BODY_CHARS = 40_000;
const MAX_RESPONSE_CHARS = 8_000;

/** Hard-blocked prefixes/paths — never callable via assistant proxy. */
const BLOCKED_PREFIXES = [
  "/api/auth",
  "/api/assistant",
  "/api/cron",
  "/api/admin/impersonate",
  "/api/agam/public",
  "/api/telegram/webhook",
  "/api/telegram/broadcast",
  "/api/notifications/broadcast",
  "/api/dovrut/lifecycle",
  "/api/malshabim/import",
  "/api/admin/onesignal",
];

/** Role-admin surfaces blocked to prevent privilege pivots via the assistant. */
const BLOCKED_SUBSTRINGS = [
  "/admin/users",
  "/admin/approvers",
];

type AllowedPrefix = {
  prefix: string;
  /** Module id required, or "platform" for platform-admin / any authenticated staff API */
  module: "tasks" | "dovrut" | "agam" | "malshabim" | "nagadim" | "platform" | "profile";
};

const ALLOWED_PREFIXES: AllowedPrefix[] = [
  { prefix: "/api/tasks", module: "tasks" },
  { prefix: "/api/projects", module: "tasks" },
  { prefix: "/api/schedules", module: "tasks" },
  { prefix: "/api/daily-planner", module: "tasks" },
  { prefix: "/api/search", module: "tasks" },
  { prefix: "/api/create-options", module: "tasks" },
  { prefix: "/api/dovrut", module: "dovrut" },
  { prefix: "/api/agam", module: "agam" },
  { prefix: "/api/malshabim", module: "malshabim" },
  { prefix: "/api/nagadim", module: "nagadim" },
  { prefix: "/api/profile", module: "profile" },
  { prefix: "/api/ui", module: "platform" },
  { prefix: "/api/notifications/status", module: "platform" },
  { prefix: "/api/notifications/morning-time", module: "platform" },
  { prefix: "/api/notifications/recipients", module: "platform" },
  { prefix: "/api/notifications/direct", module: "platform" },
  { prefix: "/api/modules/roles", module: "platform" },
  { prefix: "/api/domain-tabs", module: "platform" },
];

export const ASSISTANT_API_CATALOG = [
  { method: "GET", path: "/api/tasks", note: "רשימת משימות / לפי id" },
  { method: "POST", path: "/api/tasks", note: "יצירת משימה" },
  { method: "PATCH", path: "/api/tasks", note: "עדכון משימה" },
  { method: "DELETE", path: "/api/tasks/{id}", note: "מחיקת משימה" },
  { method: "POST", path: "/api/tasks/{id}/messages", note: "הודעה במשימה" },
  { method: "GET", path: "/api/search?q=", note: "חיפוש משימות/פרויקטים" },
  { method: "POST", path: "/api/projects", note: "יצירת פרויקט" },
  { method: "POST", path: "/api/schedules", note: "יצירת אירוע לו״ז" },
  { method: "PUT", path: "/api/daily-planner", note: "עדכון מתכנן יומי" },
  { method: "GET", path: "/api/dovrut/campaigns", note: "קמפיינים" },
  { method: "POST", path: "/api/dovrut/campaigns", note: "יצירת קמפיין" },
  { method: "POST", path: "/api/dovrut/concepts", note: "יצירת אייטם" },
  { method: "POST", path: "/api/dovrut/concepts/{id}/approval", note: "אישור/דחייה" },
  { method: "GET", path: "/api/agam/candidates", note: "מועמדי קצינים" },
  { method: "POST", path: "/api/agam/candidates", note: "יצירת מועמד" },
  { method: "PATCH", path: "/api/agam/candidates/{id}", note: "עדכון מועמד" },
  { method: "GET", path: "/api/malshabim/candidates", note: "מועמדי מלש״בים" },
  { method: "POST", path: "/api/malshabim/candidates", note: "יצירת מלש״ב" },
  { method: "PATCH", path: "/api/malshabim/candidates/{id}", note: "עדכון מלש״ב" },
  { method: "GET", path: "/api/nagadim/candidates", note: "מועמדי נגדים" },
  { method: "POST", path: "/api/nagadim/candidates", note: "יצירת נגד" },
  { method: "POST", path: "/api/nagadim/candidates/{id}/stages", note: "קידום שלב" },
  { method: "GET", path: "/api/nagadim/positions", note: "תקנים" },
  { method: "PATCH", path: "/api/profile", note: "עדכון פרופיל עצמי" },
] as const;

function startsWithPathBoundary(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`);
}

function normalizeApiPath(raw: string): string | null {
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/api/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://") || decoded.includes("\\") || decoded.includes("\0")) return null;
  if (/%2e/i.test(raw) || decoded.includes("..")) return null;

  const qIndex = decoded.indexOf("?");
  const pathPart = qIndex >= 0 ? decoded.slice(0, qIndex) : decoded;
  const query = qIndex >= 0 ? decoded.slice(qIndex) : "";
  const normalizedPath = path.posix.normalize(pathPart);
  if (!normalizedPath.startsWith("/api/") || normalizedPath.includes("..")) return null;
  if (normalizedPath.split("/").includes("..")) return null;
  return `${normalizedPath}${query}`;
}

function canAccessModule(
  module: AllowedPrefix["module"],
  access: ModuleAccessContext,
): boolean {
  if (access.isPlatformAdmin) return true;
  if (module === "platform") return true;
  if (module === "profile") return true;
  return Boolean(access.moduleRoles[module]);
}

export function resolveAllowedApiPath(
  rawPath: string,
  access: ModuleAccessContext,
): { ok: true; path: string; module: AllowedPrefix["module"] } | { ok: false; reason: string } {
  const normalized = normalizeApiPath(rawPath);
  if (!normalized) {
    return { ok: false, reason: "נתיב API לא תקין" };
  }
  const pathOnly = normalized.split("?")[0] ?? normalized;

  for (const blocked of BLOCKED_PREFIXES) {
    if (startsWithPathBoundary(pathOnly, blocked)) {
      return { ok: false, reason: `נתיב חסום: ${blocked}` };
    }
  }
  for (const part of BLOCKED_SUBSTRINGS) {
    if (pathOnly.includes(part)) {
      return { ok: false, reason: `נתיב חסום (${part})` };
    }
  }

  // Block admin edit of other users via /api/profile/{userId}
  if (/^\/api\/profile\/[^/]+/.test(pathOnly) && pathOnly !== "/api/profile/avatar") {
    if (!access.isPlatformAdmin) {
      return { ok: false, reason: "עריכת משתמש אחר חסומה" };
    }
    // Still block via assistant even for platform admin — use UI for user admin
    return { ok: false, reason: "ניהול משתמשי פלטפורמה חסום בעוזר — השתמש בממשק" };
  }

  const match = ALLOWED_PREFIXES.filter((p) => startsWithPathBoundary(pathOnly, p.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
  if (!match) {
    return { ok: false, reason: "נתיב לא ברשימת ההיתרים" };
  }
  if (!canAccessModule(match.module, access)) {
    return { ok: false, reason: `אין הרשאה למודול ${match.module}` };
  }
  return { ok: true, path: normalized, module: match.module };
}

export function catalogForAccess(access: ModuleAccessContext) {
  return ASSISTANT_API_CATALOG.filter((item) => {
    const resolved = resolveAllowedApiPath(item.path.replace(/\{[^}]+\}/g, "x"), access);
    return resolved.ok;
  });
}

function parseMethod(raw: unknown): ApiHttpMethod | null {
  const m = String(raw ?? "").toUpperCase();
  if (m === "GET" || m === "POST" || m === "PATCH" || m === "PUT" || m === "DELETE") return m;
  return null;
}

export type ApiProxyInput = {
  method: unknown;
  path: unknown;
  body?: unknown;
  label?: unknown;
  cookieHeader: string;
  origin: string;
  access: ModuleAccessContext;
};

export type ApiProxyResult = {
  ok: boolean;
  summary: string;
  label?: string;
  needsConfirm?: boolean;
  data?: unknown;
  /** Normalized args to persist in pending token */
  normalizedArgs?: {
    method: ApiHttpMethod;
    path: string;
    body?: unknown;
    label: string;
  };
};

export async function executeApiProxy(
  input: ApiProxyInput,
  options?: { confirmed?: boolean; mutateOnly?: boolean; getOnly?: boolean },
): Promise<ApiProxyResult> {
  const method = parseMethod(input.method);
  if (!method) {
    return { ok: false, summary: "method לא תקין (GET/POST/PATCH/PUT/DELETE)" };
  }
  if (options?.getOnly && method !== "GET") {
    return { ok: false, summary: "api_get מאפשר רק GET — לשינויים השתמש ב-api_mutate" };
  }
  if (options?.mutateOnly && method === "GET") {
    return { ok: false, summary: "api_mutate לשינויים בלבד — לקריאה השתמש ב-api_get" };
  }

  const resolved = resolveAllowedApiPath(String(input.path ?? ""), input.access);
  if (!resolved.ok) {
    return { ok: false, summary: resolved.reason };
  }

  // Fat candidate list dumps get truncated and miss cities like חולון — force DB search tool.
  if (method === "GET") {
    const pathOnly = resolved.path.split("?")[0] ?? resolved.path;
    const blockedLists = [
      "/api/malshabim/candidates",
      "/api/agam/candidates",
      "/api/nagadim/candidates",
    ];
    if (blockedLists.includes(pathOnly)) {
      return {
        ok: false,
        summary:
          "רשימת מועמדים מלאה חסומה ב-api_get (חותכת תוצאות). השתמש ב-search_domain_candidates עם q=עיר/שם",
        data: {
          useTool: "search_domain_candidates",
          argsHint: { q: "חולון", module: "malshabim" },
        },
      };
    }
  }

  let body: unknown = input.body;
  if (method === "GET" || method === "DELETE") {
    body = undefined;
  } else if (body !== undefined && body !== null) {
    const serialized = JSON.stringify(body);
    if (serialized.length > MAX_BODY_CHARS) {
      return { ok: false, summary: "גוף הבקשה גדול מדי" };
    }
  }

  const label =
    String(input.label ?? "").trim() ||
    `${method} ${resolved.path.split("?")[0]}`;

  if ((method !== "GET") && !options?.confirmed) {
    return {
      ok: true,
      needsConfirm: true,
      label,
      summary: `ממתין לאישור: ${label}`,
      normalizedArgs: {
        method,
        path: resolved.path,
        body,
        label,
      },
      data: { method, path: resolved.path, body },
    };
  }

  if (!input.cookieHeader.trim()) {
    return { ok: false, summary: "אין עוגיות סשן לביצוע הפעולה" };
  }
  if (!input.origin) {
    return { ok: false, summary: "חסר origin לביצוע הפעולה" };
  }

  const url = new URL(resolved.path, input.origin.endsWith("/") ? input.origin : `${input.origin}/`);
  if (url.origin !== new URL(input.origin).origin) {
    return { ok: false, summary: "origin לא תואם" };
  }

  const headers: Record<string, string> = {
    cookie: input.cookieHeader,
    accept: "application/json",
  };
  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text.slice(0, MAX_RESPONSE_CHARS);
    }
    const rawDump = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    const clipped =
      rawDump.length > MAX_RESPONSE_CHARS
        ? `${rawDump.slice(0, MAX_RESPONSE_CHARS)}…`
        : parsed;

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      if (typeof parsed === "object" && parsed && "error" in parsed) {
        errMsg = String((parsed as { error: unknown }).error);
      }
      return {
        ok: false,
        summary: errMsg,
        data: { status: res.status, body: clipped },
      };
    }

    return {
      ok: true,
      summary: `${method} הצליח (${res.status})`,
      label,
      data: { status: res.status, body: clipped },
    };
  } catch (error) {
    return {
      ok: false,
      summary: error instanceof Error ? error.message : "כשל ברשת פנימית",
    };
  }
}

export function buildRequestOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}
