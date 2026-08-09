export type ModuleRole = "admin" | "user" | "approver";

export interface ModuleNavItem {
  label: string;
  href: string;
  description?: string;
  roles?: ModuleRole[];
  adminOnly?: boolean;
}

export interface AppModuleDefinition {
  id: string;
  label: string;
  description: string;
  href: string;
  navItems: ModuleNavItem[];
  adminNavItems?: ModuleNavItem[];
  breadcrumbLabels?: Record<string, string>;
}

export interface ModuleAccessContext {
  isPlatformAdmin: boolean;
  moduleRoles: Record<string, ModuleRole | undefined>;
}

export function resolveActiveModuleId(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return null;
  if (pathname.startsWith("/dovrut")) return "dovrut";
  if (
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/domains") ||
    pathname.startsWith("/subtopics") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings")
  ) {
    return "tasks";
  }
  return null;
}

export function canAccessModule(
  moduleId: string,
  access: ModuleAccessContext,
): boolean {
  if (access.isPlatformAdmin) return true;
  return Boolean(access.moduleRoles[moduleId]);
}

export function getModuleNavItems(
  moduleDef: AppModuleDefinition,
  access: ModuleAccessContext,
  options?: { isImpersonating?: boolean },
): ModuleNavItem[] {
  const role = access.moduleRoles[moduleDef.id];
  const isAdmin =
    access.isPlatformAdmin || role === "admin";
  const showAdmin =
    isAdmin && !options?.isImpersonating;

  if (role === "approver" && !access.isPlatformAdmin) {
    return moduleDef.navItems.filter(
      (item) => !item.adminOnly && (item.roles?.includes("approver") ?? false),
    );
  }

  const base = moduleDef.navItems.filter((item) => {
    if (item.adminOnly && !showAdmin) return false;
    if (!item.roles) return true;
    if (access.isPlatformAdmin) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });

  const adminItems =
    showAdmin && moduleDef.adminNavItems ? moduleDef.adminNavItems : [];

  return [...base, ...adminItems];
}
