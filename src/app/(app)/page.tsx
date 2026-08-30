import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ModuleHomeClient } from "@/components/module-home-client";
import { moduleIdFromPath, sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import { AuthorizationService } from "@/services/authorization.service";
import { listAccessibleModules } from "@/shared/modules/registry";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import type { ModuleRole } from "@/shared/modules/types";

type HomeSearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(
  q: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = q[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function moduleEntryHref(moduleId: string, href: string, role?: ModuleRole): string {
  if (moduleId === "dovrut" && role === "approver") return "/dovrut/approvals";
  return href;
}

export default async function PlatformHomePage({
  searchParams,
}: {
  searchParams?: HomeSearchParams;
}) {
  const q = searchParams ? await searchParams : {};
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  const isPlatformAdmin = profile?.role === "admin";

  const roles = profile
    ? await new ModuleRoleService().getRolesForUser(profile.id)
    : {};

  const modules = listAccessibleModules({
    isPlatformAdmin: Boolean(isPlatformAdmin),
    moduleRoles: roles,
  });

  const rawCallback = pickParam(q, "callbackUrl");
  const requestedPath = sanitizeCallbackUrl(rawCallback, "");
  const callbackPath =
    requestedPath && requestedPath !== "/" ? requestedPath : "";

  if (callbackPath) {
    const moduleId = moduleIdFromPath(callbackPath);
    if (moduleId && (roles[moduleId] || isPlatformAdmin)) {
      redirect(
        moduleEntryHref(moduleId, callbackPath, roles[moduleId]),
      );
    }
    redirect("/");
  }

  if (modules.length === 1) {
    const only = modules[0];
    redirect(moduleEntryHref(only.id, only.href, roles[only.id]));
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-muted">
          טוען מערכות…
        </div>
      }
    >
      <ModuleHomeClient
        isPlatformAdmin={Boolean(isPlatformAdmin)}
        initialRoles={roles}
      />
    </Suspense>
  );
}
