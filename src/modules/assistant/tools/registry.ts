import { randomUUID } from "node:crypto";
import path from "node:path";
import { AuthorizationService } from "@/services/authorization.service";
import { SearchService } from "@/services/search.service";
import {
  appModules,
  getModuleById,
  getModuleNavItems,
  listAccessibleModules,
  type ModuleAccessContext,
} from "@/shared/modules/registry";
import { AssistantRagService } from "@/modules/assistant/services/rag.service";
import type { AssistantToolSide } from "@/modules/assistant/lib/protocol";
import type { Profile } from "@/types/models";
import {
  catalogForAccess,
  executeApiProxy,
} from "@/modules/assistant/tools/api-proxy";
import { listWaitingScreening } from "@/modules/assistant/tools/domain-screening";
import { classifyMutationSeverity } from "@/modules/assistant/lib/severity";
import type { AssistantConfirmSeverity } from "@/modules/assistant/lib/protocol";

export type AssistantToolDefinition = {
  name: string;
  side: AssistantToolSide;
  description: string;
  argsHint: string;
};

export type AssistantToolContext = {
  profile: Profile;
  access: ModuleAccessContext;
  pathname: string;
  cookieHeader?: string;
  origin?: string;
};

export type AssistantToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  navigate?: { href: string; label: string };
  needsConfirm?: boolean;
  label?: string;
  severity?: AssistantConfirmSeverity;
  beforeSnapshot?: unknown;
};

const rag = new AssistantRagService();

export const ASSISTANT_TOOL_DEFINITIONS: AssistantToolDefinition[] = [
  {
    name: "search_knowledge",
    side: "read",
    description: "חיפוש בידע הפנימי על המודולים והפלטפורמה",
    argsHint: '{ "query": "string" }',
  },
  {
    name: "list_routes",
    side: "read",
    description: "רשימת מסכים/נתיבים שהמשתמש מורשה לראות",
    argsHint: "{ }",
  },
  {
    name: "search_tasks",
    side: "read",
    description: "חיפוש משימות ופרויקטים חיים במודול המשימות",
    argsHint: '{ "query": "string" }',
  },
  {
    name: "get_module_summary",
    side: "read",
    description: "סיכום מודול לפי מזהה (tasks/dovrut/agam/malshabim/nagadim/platform)",
    argsHint: '{ "moduleId": "string" }',
  },
  {
    name: "list_actions",
    side: "read",
    description: "קטלוג פעולות API מותרות למשתמש הנוכחי (לפי הרשאות)",
    argsHint: "{ }",
  },
  {
    name: "list_waiting_screening",
    side: "read",
    description:
      "רשימת מועמדים שעוד מחכים בתהליך מיון (אגם: ממתין; מלש״בים: ממתין לריאיון/בטיפול; נגדים: בצינור). אפשר לסנן מודול.",
    argsHint: '{ "module": "all|agam|malshabim|nagadim", "limit": 80 }',
  },
  {
    name: "create_task",
    side: "write",
    description: "יצירת משימה חדשה (דורש אישור). חובה title + subtopicIds.",
    argsHint:
      '{ "title": "...", "subtopicIds": ["uuid"], "assignedToIds": ["uuid"], "dueDate": "YYYY-MM-DD", "description": "...", "priority": "low|medium|high", "label": "..." }',
  },
  {
    name: "update_task",
    side: "write",
    description:
      "עדכון/העברת משימה קיימת: סטטוס, אחראים (assignedToIds), פרויקט, תתי-נושאים. דורש אישור. סגירה (completed) = הרסני.",
    argsHint:
      '{ "id": "task-uuid", "status": "in_progress|completed", "assignedToIds": ["uuid"], "projectId": "uuid|null", "subtopicIds": ["uuid"], "title": "...", "label": "..." }',
  },
  {
    name: "api_get",
    side: "read",
    description:
      "קריאת GET ל-API פנימי שהמשתמש מורשה אליו (אותן הרשאות כמו בממשק). לדוגמה /api/malshabim/candidates",
    argsHint: '{ "path": "/api/...", "label": "optional" }',
  },
  {
    name: "api_mutate",
    side: "write",
    description:
      "ביצוע פעולת שינוי (POST/PATCH/PUT/DELETE) דרך API פנימי עם הרשאות המשתמש — דורש אישור; מחיקות/דחיות = אישור הרסני",
    argsHint:
      '{ "method": "POST|PATCH|PUT|DELETE", "path": "/api/...", "body": {}, "label": "תיאור קצר בעברית" }',
  },
  {
    name: "navigate",
    side: "write",
    description: "ניווט למסך בפלטפורמה (דורש אישור משתמש)",
    argsHint: '{ "href": "/path", "label": "optional label" }',
  },
];

export function formatToolDescriptions(): string {
  return ASSISTANT_TOOL_DEFINITIONS.map(
    (t) => `- ${t.name} [${t.side}]: ${t.description}. args: ${t.argsHint}`,
  ).join("\n");
}

function collectAllowedRoutes(access: ModuleAccessContext): Array<{ href: string; label: string; moduleId: string }> {
  const routes: Array<{ href: string; label: string; moduleId: string }> = [];
  for (const moduleDef of listAccessibleModules(access)) {
    const items = getModuleNavItems(moduleDef, access, { isImpersonating: false });
    for (const item of items) {
      routes.push({ href: item.href, label: item.label, moduleId: moduleDef.id });
    }
    routes.push({ href: moduleDef.href, label: moduleDef.label, moduleId: moduleDef.id });
  }
  routes.push({ href: "/", label: "פלטפורמה", moduleId: "platform" });
  const seen = new Set<string>();
  return routes.filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  });
}

function normalizeInternalHref(raw: string): string | null {
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://") || decoded.includes("\\") || decoded.includes("\0")) return null;
  if (/%2e/i.test(raw) || decoded.includes("..")) return null;

  const qIndex = decoded.indexOf("?");
  const hashIndex = decoded.indexOf("#");
  let pathPart = decoded;
  let suffix = "";
  if (qIndex >= 0) {
    pathPart = decoded.slice(0, qIndex);
    suffix = decoded.slice(qIndex);
  } else if (hashIndex >= 0) {
    pathPart = decoded.slice(0, hashIndex);
    suffix = decoded.slice(hashIndex);
  }

  const normalizedPath = path.posix.normalize(pathPart);
  if (!normalizedPath.startsWith("/") || normalizedPath.includes("..")) return null;
  if (normalizedPath.split("/").includes("..")) return null;

  return `${normalizedPath}${suffix}`;
}

function startsWithPathBoundary(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isHrefAllowed(
  href: string,
  access: ModuleAccessContext,
): { ok: true; label: string; href: string } | { ok: false } {
  const normalized = normalizeInternalHref(href);
  if (!normalized) return { ok: false };

  const pathOnly = normalized.split("?")[0]?.split("#")[0] ?? normalized;
  const allowed = collectAllowedRoutes(access);
  const exact = allowed.find((r) => r.href === pathOnly || r.href === normalized);
  if (exact) return { ok: true, label: exact.label, href: normalized };

  const prefixHit = allowed
    .filter((r) => r.href !== "/")
    .sort((a, b) => b.href.length - a.href.length)
    .find((r) => startsWithPathBoundary(pathOnly, r.href));
  if (prefixHit) {
    return { ok: true, label: prefixHit.label, href: normalized };
  }

  if (
    (startsWithPathBoundary(pathOnly, "/dashboard") ||
      startsWithPathBoundary(pathOnly, "/tasks") ||
      startsWithPathBoundary(pathOnly, "/projects")) &&
    (access.isPlatformAdmin || Boolean(access.moduleRoles.tasks))
  ) {
    return { ok: true, label: "משימות", href: normalized };
  }

  return { ok: false };
}

export async function executeAssistantTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AssistantToolContext,
  options?: { confirmed?: boolean },
): Promise<AssistantToolResult> {
  switch (name) {
    case "search_knowledge": {
      const query = String(args.query ?? "").trim();
      const hits = rag.search(query || ctx.pathname, 4);
      return {
        ok: true,
        summary: hits.length ? `מצאתי ${hits.length} קטעים` : "לא מצאתי",
        data: hits,
      };
    }
    case "list_routes": {
      const routes = collectAllowedRoutes(ctx.access);
      return {
        ok: true,
        summary: `${routes.length} מסכים`,
        data: routes,
      };
    }
    case "search_tasks": {
      const query = String(args.query ?? "").trim();
      if (query.length < 2) {
        return { ok: false, summary: "query קצר מדי" };
      }
      const auth = new AuthorizationService();
      const access = await auth.getTaskAccessContext(ctx.profile);
      const results = await new SearchService().search(access, query, 8);
      return {
        ok: true,
        summary: `${results.tasks.length} משימות, ${results.projects.length} פרויקטים`,
        data: results,
      };
    }
    case "get_module_summary": {
      const moduleId = String(args.moduleId ?? "").trim() || "platform";
      const doc = rag.getById(moduleId);
      const moduleDef = getModuleById(moduleId);
      if (!doc && !moduleDef) {
        return { ok: false, summary: `מודול לא נמצא: ${moduleId}` };
      }
      return {
        ok: true,
        summary: doc?.title ?? moduleDef?.label ?? moduleId,
        data: {
          moduleId,
          label: moduleDef?.label,
          description: moduleDef?.description,
          knowledge: doc?.body ?? null,
          knownModules: appModules.map((m) => m.id),
        },
      };
    }
    case "list_actions": {
      const catalog = catalogForAccess(ctx.access);
      return {
        ok: true,
        summary: `${catalog.length} פעולות בקטלוג`,
        data: {
          catalog,
          note: "לזרימות מיון השתמש ב-list_waiting_screening; למשימות create_task/update_task; לשאר api_get/api_mutate",
        },
      };
    }
    case "list_waiting_screening": {
      const moduleRaw = String(args.module ?? "all").trim().toLowerCase();
      const moduleFilter =
        moduleRaw === "agam" || moduleRaw === "malshabim" || moduleRaw === "nagadim"
          ? moduleRaw
          : "all";
      const limit = Number(args.limit ?? 80);
      return listWaitingScreening({
        access: ctx.access,
        module: moduleFilter,
        limit: Number.isFinite(limit) ? limit : 80,
      });
    }
    case "create_task": {
      if (options?.confirmed && args.method && args.path) {
        return runMutateTool(
          ctx,
          {
            method: args.method,
            path: args.path,
            body: args.body,
            label: args.label,
          },
          options,
          "create_task",
          args,
        );
      }
      const title = String(args.title ?? "").trim();
      const subtopicIds = Array.isArray(args.subtopicIds)
        ? args.subtopicIds.map((id) => String(id))
        : [];
      if (!title || subtopicIds.length === 0) {
        return { ok: false, summary: "חסר title או subtopicIds" };
      }
      const body = {
        title,
        subtopicIds,
        assignedToIds: Array.isArray(args.assignedToIds)
          ? args.assignedToIds.map((id) => String(id))
          : undefined,
        dueDate: args.dueDate ?? null,
        description: args.description ?? null,
        priority: args.priority ?? "medium",
        status: "in_progress",
      };
      const label = String(args.label ?? `יצירת משימה: ${title}`).trim();
      return runMutateTool(
        ctx,
        {
          method: "POST",
          path: "/api/tasks",
          body,
          label,
        },
        options,
        "create_task",
      );
    }
    case "update_task": {
      if (options?.confirmed && args.method && args.path) {
        return runMutateTool(
          ctx,
          {
            method: args.method,
            path: args.path,
            body: args.body,
            label: args.label,
          },
          options,
          "update_task",
          args,
        );
      }
      const id = String(args.id ?? "").trim();
      if (!id) return { ok: false, summary: "חסר id של משימה" };
      const body: Record<string, unknown> = { id };
      for (const key of [
        "title",
        "status",
        "priority",
        "description",
        "dueDate",
        "assignedToIds",
        "projectId",
        "subtopicIds",
      ] as const) {
        if (args[key] !== undefined) body[key] = args[key];
      }
      const label = String(args.label ?? `עדכון משימה ${id.slice(0, 8)}`).trim();
      return runMutateTool(
        ctx,
        {
          method: "PATCH",
          path: "/api/tasks",
          body,
          label,
        },
        options,
        "update_task",
        args,
      );
    }
    case "api_get": {
      const result = await executeApiProxy(
        {
          method: "GET",
          path: args.path,
          label: args.label,
          cookieHeader: ctx.cookieHeader ?? "",
          origin: ctx.origin ?? "",
          access: ctx.access,
        },
        { getOnly: true, confirmed: true },
      );
      return {
        ok: result.ok,
        summary: result.summary,
        data: result.data,
        label: result.label,
      };
    }
    case "api_mutate": {
      return runMutateTool(
        ctx,
        {
          method: args.method,
          path: args.path,
          body: args.body,
          label: args.label,
        },
        options,
        "api_mutate",
        args,
      );
    }
    case "navigate": {
      const href = String(args.href ?? "").trim();
      const labelArg = String(args.label ?? "").trim();
      const allowed = isHrefAllowed(href, ctx.access);
      if (!allowed.ok) {
        return { ok: false, summary: `נתיב לא מורשה: ${href}` };
      }
      const label = labelArg || allowed.label;
      const safeHref = allowed.href;
      if (!options?.confirmed) {
        return {
          ok: true,
          needsConfirm: true,
          severity: "normal",
          label: `לעבור אל ${label}`,
          summary: `ממתין לאישור ניווט ל-${safeHref}`,
          navigate: { href: safeHref, label },
        };
      }
      return {
        ok: true,
        summary: `מנווט ל-${label}`,
        navigate: { href: safeHref, label },
        label,
        severity: "normal",
      };
    }
    default:
      return { ok: false, summary: `כלי לא מוכר: ${name}` };
  }
}

async function runMutateTool(
  ctx: AssistantToolContext,
  proxyArgs: {
    method: unknown;
    path: unknown;
    body?: unknown;
    label?: unknown;
  },
  options: { confirmed?: boolean } | undefined,
  toolName: string,
  severityArgs?: Record<string, unknown>,
): Promise<AssistantToolResult> {
  const proxyInput = {
    method: proxyArgs.method,
    path: proxyArgs.path,
    body: proxyArgs.body,
    label: proxyArgs.label,
    cookieHeader: ctx.cookieHeader ?? "",
    origin: ctx.origin ?? "",
    access: ctx.access,
  };

  let beforeSnapshot: unknown = null;
  const method = String(proxyArgs.method ?? "").toUpperCase();
  const pathStr = String(proxyArgs.path ?? "");
  if (
    options?.confirmed &&
    (method === "DELETE" || method === "PATCH" || method === "PUT") &&
    pathStr.includes("/api/") &&
    ctx.cookieHeader &&
    ctx.origin
  ) {
    // Best-effort backup snapshot via GET on same resource when possible
    const getPath = pathStr.includes("?") ? pathStr.split("?")[0]! : pathStr;
    if (method === "DELETE" || /\/api\/(agam|malshabim|nagadim)\/candidates\//.test(getPath)) {
      const snap = await executeApiProxy(
        {
          method: "GET",
          path: getPath,
          cookieHeader: ctx.cookieHeader,
          origin: ctx.origin,
          access: ctx.access,
        },
        { getOnly: true, confirmed: true },
      );
      if (snap.ok) beforeSnapshot = snap.data;
    }
    if (toolName === "update_task") {
      const taskId = String((proxyArgs.body as { id?: string } | undefined)?.id ?? "");
      if (taskId) {
        const snap = await executeApiProxy(
          {
            method: "GET",
            path: `/api/tasks/${taskId}`,
            cookieHeader: ctx.cookieHeader,
            origin: ctx.origin,
            access: ctx.access,
          },
          { getOnly: true, confirmed: true },
        );
        if (snap.ok) beforeSnapshot = snap.data;
      }
    }
  }

  if (!options?.confirmed) {
    const preview = await executeApiProxy(proxyInput, {
      mutateOnly: true,
      confirmed: false,
    });
    const severity = classifyMutationSeverity({
      toolName,
      method: String(proxyArgs.method ?? ""),
      path: String(proxyArgs.path ?? ""),
      args: severityArgs ?? {
        method: proxyArgs.method,
        path: proxyArgs.path,
        body: proxyArgs.body,
      },
    });
    return {
      ok: preview.ok,
      needsConfirm: preview.needsConfirm,
      label: preview.label ?? "לבצע פעולה",
      summary: preview.summary,
      data: preview.normalizedArgs ?? preview.data,
      severity,
    };
  }

  const executed = await executeApiProxy(proxyInput, {
    mutateOnly: true,
    confirmed: true,
  });
  const severity = classifyMutationSeverity({
    toolName,
    method: String(proxyArgs.method ?? ""),
    path: String(proxyArgs.path ?? ""),
    args: severityArgs ?? {
      method: proxyArgs.method,
      path: proxyArgs.path,
      body: proxyArgs.body,
    },
  });
  return {
    ok: executed.ok,
    summary: executed.summary,
    data: executed.data,
    label: executed.label,
    severity,
    beforeSnapshot,
  };
}

export function newToolCallId(): string {
  return randomUUID();
}

export { collectAllowedRoutes, isHrefAllowed, normalizeInternalHref };
