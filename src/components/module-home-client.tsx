"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  listAccessibleModules,
  type ModuleAccessContext,
  type ModuleRole,
} from "@/shared/modules/registry";
import { writeLastModuleId } from "@/shared/modules/last-module";
import { moduleIdFromPath, sanitizeCallbackUrl } from "@/lib/auth/callback-url";

function moduleEntryHref(moduleId: string, href: string, role?: ModuleRole): string {
  if (moduleId === "dovrut" && role === "approver") return "/dovrut/approvals";
  return href;
}

export function ModuleHomeClient({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirected = useRef(false);
  const [moduleRoles, setModuleRoles] = useState<Record<string, ModuleRole>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/modules/roles")
      .then((response) => response.json())
      .then((data: { roles?: Record<string, ModuleRole> }) => {
        setModuleRoles(data.roles ?? {});
      })
      .finally(() => setLoaded(true));
  }, []);

  const access: ModuleAccessContext = useMemo(
    () => ({
      isPlatformAdmin,
      moduleRoles,
    }),
    [isPlatformAdmin, moduleRoles],
  );
  const modules = useMemo(() => listAccessibleModules(access), [access]);
  const onlyModule = modules.length === 1 ? modules[0] : null;
  const requestedPath = sanitizeCallbackUrl(searchParams.get("callbackUrl"), "");

  useEffect(() => {
    if (!loaded || redirected.current) return;

    if (requestedPath) {
      const moduleId = moduleIdFromPath(requestedPath);
      if (moduleId && moduleRoles[moduleId]) {
        redirected.current = true;
        writeLastModuleId(moduleId);
        const targetModule = modules.find((module) => module.id === moduleId);
        const href =
          moduleId === "dovrut" && moduleRoles.dovrut === "approver"
            ? "/dovrut/approvals"
            : requestedPath.startsWith("/dovrut") ||
                requestedPath.startsWith("/agam") ||
                requestedPath.startsWith("/dashboard")
              ? requestedPath
              : targetModule
                ? moduleEntryHref(targetModule.id, targetModule.href, moduleRoles[targetModule.id])
                : requestedPath;
        router.replace(href);
        return;
      }
      redirected.current = true;
      router.replace("/");
      return;
    }

    if (!onlyModule) return;
    redirected.current = true;
    writeLastModuleId(onlyModule.id);
    router.replace(
      moduleEntryHref(onlyModule.id, onlyModule.href, moduleRoles[onlyModule.id]),
    );
  }, [loaded, onlyModule, moduleRoles, modules, requestedPath, router]);

  if (!loaded || onlyModule || requestedPath) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-muted">
        מעביר למערכת…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">בחירת מערכת</h1>
        <p className="mt-1 text-sm text-text-secondary">
          בחרו לאיזו אפליקציה להיכנס. הגישה נקבעת לפי ההרשאות שקיבלתם.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.id}
            href={moduleEntryHref(module.id, module.href, moduleRoles[module.id])}
            onClick={() => writeLastModuleId(module.id)}
            className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm transition hover:border-accent-primary/40 hover:shadow-md dark:border-white/10 dark:bg-[#161922]"
          >
            <h2 className="text-lg font-extrabold text-text-primary">{module.label}</h2>
            <p className="mt-2 text-sm text-text-muted">{module.description}</p>
            <span className="mt-4 inline-flex text-xs font-bold text-accent-primary">כניסה →</span>
          </Link>
        ))}
      </div>
      {modules.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          אין לכם גישה למודולים. פנו למנהל המערכת.
        </p>
      ) : null}
    </div>
  );
}
