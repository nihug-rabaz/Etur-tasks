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
      const [rolesRes, sessionRes] = await Promise.all([
        fetch("/api/modules/roles"),
        fetch("/api/auth/session"),
      ]);
      if (cancelled) return;
      const rolesData = rolesRes.ok ? await rolesRes.json() : { roles: {} };
      const sessionData = sessionRes.ok ? await sessionRes.json() : null;
      const isPlatformAdmin =
        sessionData?.user?.role === "admin" || Boolean(sessionData?.user?.isAdmin);
      const nextRole =
        (rolesData.roles?.agam as ModuleRole | undefined) ??
        (isPlatformAdmin ? "admin" : null);
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
