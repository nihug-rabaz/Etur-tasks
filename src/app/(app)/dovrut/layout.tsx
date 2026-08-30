import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DovrutSectionNav } from "@/modules/dovrut/components/section-nav";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";

const APPROVER_PREFIXES = ["/dovrut/approvals", "/dovrut/approval/"];

function isApproverAllowedPath(pathname: string): boolean {
  return APPROVER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export default async function DovrutLayout({ children }: { children: ReactNode }) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }

  const { headers } = await import("next/headers");
  const pathname = (await headers()).get("x-etur-pathname")?.split("?")[0] ?? "/dovrut";
  if (access.role === "approver" && !isApproverAllowedPath(pathname)) {
    redirect("/dovrut/approvals");
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] [&_input]:text-base [&_select]:text-base [&_textarea]:text-base">
      {access.role !== "approver" ? <DovrutSectionNav /> : null}
      {children}
    </div>
  );
}
