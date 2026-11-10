import type { ModuleAccessContext, ModuleRole } from "@/shared/modules/types";

const EDIT_ROLES: ModuleRole[] = ["admin", "user"];

export function canSubmitDevFeedback(
  access: ModuleAccessContext,
  moduleId: string | null | undefined,
): boolean {
  if (access.isPlatformAdmin) return true;
  if (!moduleId) return false;
  const role = access.moduleRoles[moduleId];
  return role != null && EDIT_ROLES.includes(role);
}

export const LIAD_MODULES = new Set(["malshabim", "nagadim", "dovrut"]);

export function resolveDevAssigneeTarget(
  moduleId: string | null | undefined,
): "liad" | "zohar" {
  if (moduleId && LIAD_MODULES.has(moduleId)) return "liad";
  return "zohar";
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
      return "אג״ם";
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
