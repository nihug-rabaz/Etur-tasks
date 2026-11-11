import type { ModuleAccessContext, ModuleRole } from "@/shared/modules/types";

const EDIT_ROLES: ModuleRole[] = ["admin", "user"];

export function canSubmitDevFeedback(
  access: ModuleAccessContext,
  moduleId: string | null | undefined,
): boolean {
  if (access.isPlatformAdmin) return true;
  if (moduleId) {
    const role = access.moduleRoles[moduleId];
    if (role != null && EDIT_ROLES.includes(role)) return true;
  }
  // Allow picker override: any module edit role (or tasks) can open feedback.
  return Object.values(access.moduleRoles).some(
    (role) => role != null && EDIT_ROLES.includes(role),
  );
}

export const LIAD_MODULES = new Set(["malshabim", "nagadim", "dovrut"]);

export function resolveDevAssigneeTarget(
  moduleId: string | null | undefined,
): "liad" | "zohar" {
  if (moduleId && LIAD_MODULES.has(moduleId)) return "liad";
  return "zohar";
}

/** Modules shown in the feedback picker (manual override + auto-suggest). */
export const DEV_FEEDBACK_MODULE_OPTIONS = [
  { id: "malshabim", label: "מלש״בים" },
  { id: "dovrut", label: "דוברות" },
  { id: "agam", label: "קצינים" },
  { id: "nagadim", label: "נגדים" },
] as const;

export type DevFeedbackModuleId =
  (typeof DEV_FEEDBACK_MODULE_OPTIONS)[number]["id"];

export function isDevFeedbackModuleId(id: string): id is DevFeedbackModuleId {
  return DEV_FEEDBACK_MODULE_OPTIONS.some((m) => m.id === id);
}

/** Suggest a feedback module from the current window path. */
export function suggestDevFeedbackModuleId(
  pathname: string | null | undefined,
): DevFeedbackModuleId {
  const raw = pathname || "";
  if (raw.includes("/malshabim")) return "malshabim";
  if (raw.includes("/dovrut")) return "dovrut";
  if (raw.includes("/agam") || raw.includes("/ktizin") || raw.includes("/katzin")) {
    return "agam";
  }
  if (raw.includes("/nagadim")) return "nagadim";
  return "malshabim";
}

export function moduleLabel(moduleId: string | null | undefined): string {
  switch (moduleId) {
    case "malshabim":
      return "מלש״בים";
    case "nagadim":
      return "נגדים";
    case "dovrut":
      return "דוברות";
    case "agam":
      return "קצינים";
    case "tasks":
      return "משימות";
    default:
      return moduleId || "כללי";
  }
}

export const LABEL_DEV_FEEDBACK = "dev-feedback";
export const LABEL_AWAITING_KOBI = "awaiting-kobi-approval";
export const LABEL_APPROVED = "approved-for-dev";
export const LABEL_REJECTED = "kobi-rejected";

export function moduleLabelTag(moduleId: string): string {
  return `module-${moduleId}`;
}

export function parseModuleIdFromLabels(labels: string[] | undefined): string | null {
  if (!labels?.length) return null;
  const hit = labels.find((l) => l.startsWith("module-"));
  if (!hit) return null;
  return hit.slice("module-".length) || null;
}
