import type { ModuleRole } from "@/shared/modules/types";

export function canAdmin(role: ModuleRole | null | undefined): boolean {
  return role === "admin";
}

export function canRamad(role: ModuleRole | null | undefined): boolean {
  return role === "admin" || role === "ramad";
}

export function canEvaluate(role: ModuleRole | null | undefined): boolean {
  return role === "admin" || role === "ramad" || role === "user";
}

export function canModifyTimelineEvent(
  role: ModuleRole | null | undefined,
  createdById: string | null | undefined,
  currentUserId: string,
): boolean {
  if (!role) return false;
  return canRamad(role) || createdById === currentUserId;
}
