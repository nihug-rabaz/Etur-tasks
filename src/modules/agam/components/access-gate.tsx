"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { AgamSectionNav } from "@/modules/agam/components/section-nav";
import type { ModuleRole } from "@/shared/modules/types";

export function AgamAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<ModuleRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const rolesRes = await fetch("/api/modules/roles");
      if (cancelled) return;
      const rolesData = rolesRes.ok ? await rolesRes.json() : { roles: {} };
      const nextRole = (rolesData.roles?.agam as ModuleRole | undefined) ?? null;
      if (!nextRole) {
        router.replace("/");
        return;
      }
      setRole(nextRole);
      setReady(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-muted">
        טוען…
      </div>
    );
  }

  return (
    <>
      <AgamSectionNav role={role} />
      {children}
    </>
  );
}
