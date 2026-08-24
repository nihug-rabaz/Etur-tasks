import { agamModule } from "@/modules/agam/module";
import { dovrutModule } from "@/modules/dovrut/module";
import { tasksModule } from "@/modules/tasks/module";
import type { AppModuleDefinition } from "@/shared/modules/types";
import {
  canAccessModule,
  getModuleNavItems,
  resolveActiveModuleId,
  type ModuleAccessContext,
  type ModuleNavItem,
  type ModuleRole,
} from "@/shared/modules/types";

export const appModules: AppModuleDefinition[] = [tasksModule, dovrutModule, agamModule];

export function getModuleById(id: string): AppModuleDefinition | undefined {
  return appModules.find((module) => module.id === id);
}

export function listAccessibleModules(access: ModuleAccessContext): AppModuleDefinition[] {
  return appModules.filter((module) => canAccessModule(module.id, access));
}

export function getNavForPathname(
  pathname: string,
  access: ModuleAccessContext,
  options?: { isImpersonating?: boolean },
): { module: AppModuleDefinition | null; items: ModuleNavItem[] } {
  const moduleId = resolveActiveModuleId(pathname);
  if (!moduleId) {
    return { module: null, items: [] };
  }
  const moduleDef = getModuleById(moduleId) ?? null;
  if (!moduleDef || !canAccessModule(moduleId, access)) {
    return { module: moduleDef, items: [] };
  }
  return {
    module: moduleDef,
    items: getModuleNavItems(moduleDef, access, options),
  };
}

export {
  canAccessModule,
  getModuleNavItems,
  resolveActiveModuleId,
  type ModuleAccessContext,
  type ModuleNavItem,
  type ModuleRole,
  type AppModuleDefinition,
};
