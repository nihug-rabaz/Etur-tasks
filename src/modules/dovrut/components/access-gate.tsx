"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import type { ModuleRole } from "@/shared/modules/types";

const APPROVER_PREFIXES = [
  "/dovrut/approvals",
  "/dovrut/approval/",
];

function isApproverAllowedPath(pathname: string): boolean {
  return APPROVER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function DovrutAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [sessionRes, rolesRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/modules/roles"),
      ]);
      if (cancelled) return;

      const session = sessionRes.ok ? await sessionRes.json() : null;
      const rolesData = rolesRes.ok ? await rolesRes.json() : { roles: {} };
      const isPlatformAdmin =
        session?.user?.role === "admin" || Boolean(session?.user?.isAdmin);
      const role = (rolesData.roles?.dovrut as ModuleRole | undefined) ?? null;

      if (!isPlatformAdmin && !role) {
        setDenied(true);
        setReady(true);
        return;
      }

      if (role === "approver" && !isPlatformAdmin && !isApproverAllowedPath(pathname)) {
        router.replace("/dovrut/approvals");
        return;
      }

      setDenied(false);
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

  if (denied) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        אין לכם גישה למודול דוברות. פנו למנהל המערכת.
      </div>
    );
  }

  return <>{children}</>;
}
