"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  listAccessibleModules,
  type ModuleAccessContext,
  type ModuleRole,
} from "@/shared/modules/registry";

function moduleEntryHref(moduleId: string, href: string, role?: ModuleRole): string {
  if (moduleId === "dovrut" && role === "approver") return "/dovrut/approvals";
  return href;
}

export function ModuleHomeClient({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const router = useRouter();
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

  const access: ModuleAccessContext = {
    isPlatformAdmin,
    moduleRoles,
  };
  const modules = listAccessibleModules(access);
  const onlyModule = modules.length === 1 ? modules[0] : null;

  useEffect(() => {
    if (!loaded || !onlyModule) return;
    router.replace(
      moduleEntryHref(onlyModule.id, onlyModule.href, moduleRoles[onlyModule.id]),
    );
  }, [loaded, onlyModule, moduleRoles, router]);

  if (!loaded || onlyModule) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-muted">
        טוען מודולים…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">בחירת מערכת</h1>
        <p className="mt-1 text-sm text-text-secondary">
          הפלטפורמה מכילה מודולים עצמאיים. בחרו מערכת להמשך העבודה.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.id}
            href={moduleEntryHref(module.id, module.href, moduleRoles[module.id])}
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
