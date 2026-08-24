"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { DovrutSectionNav } from "@/modules/dovrut/components/section-nav";
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
  const [role, setRole] = useState<ModuleRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const rolesRes = await fetch("/api/modules/roles");
      if (cancelled) return;

      const rolesData = rolesRes.ok ? await rolesRes.json() : { roles: {} };
      const nextRole = (rolesData.roles?.dovrut as ModuleRole | undefined) ?? null;

      if (!nextRole) {
        router.replace("/");
        return;
      }

      if (nextRole === "approver" && !isApproverAllowedPath(pathname)) {
        router.replace("/dovrut/approvals");
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] [&_input]:text-base [&_select]:text-base [&_textarea]:text-base">
      {role && role !== "approver" ? <DovrutSectionNav /> : null}
      {children}
    </div>
  );
}
