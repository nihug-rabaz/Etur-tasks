"use client";

import { useEffect, useState } from "react";
import { PlatformPortal } from "@/components/platform-portal";
import type { ModuleRole } from "@/shared/modules/registry";

export function ModuleHomeClient({
  isPlatformAdmin,
  initialRoles = {},
}: {
  isPlatformAdmin: boolean;
  initialRoles?: Record<string, ModuleRole>;
}) {
  const [moduleRoles, setModuleRoles] = useState<Record<string, ModuleRole>>(initialRoles);
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/modules/roles")
      .then(async (response) => {
        if (!response.ok) return { roles: initialRoles };
        return (await response.json()) as { roles?: Record<string, ModuleRole> };
      })
      .then((data) => {
        if (cancelled) return;
        setModuleRoles(data.roles ?? initialRoles);
      })
      .catch(() => {
        if (!cancelled) setModuleRoles(initialRoles);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialRoles]);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#07070b] p-8 text-sm text-white/70">
        טוען מערכות…
      </div>
    );
  }

  return (
    <PlatformPortal isPlatformAdmin={isPlatformAdmin} moduleRoles={moduleRoles} variant="page" />
  );
}
