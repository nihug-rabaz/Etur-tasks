import type { ModuleRole } from "@/shared/modules/types";

/** Soldier with only the Agam candidate role — dedicated self-service UX, no platform portal. */
export function isAgamCandidateSoldier(input: {
  isPlatformAdmin?: boolean;
  platformRole?: string | null;
  moduleRoles: Record<string, ModuleRole | undefined>;
}): boolean {
  if (input.isPlatformAdmin || input.platformRole === "admin") return false;
  if (input.moduleRoles.agam !== "candidate") return false;
  const otherModules = Object.entries(input.moduleRoles).filter(
    ([moduleId, role]) => moduleId !== "agam" && Boolean(role),
  );
  return otherModules.length === 0;
}
