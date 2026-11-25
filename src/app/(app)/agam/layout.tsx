import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AgamSectionNav } from "@/modules/agam/components/section-nav";
import { AgamAccessService } from "@/modules/agam/services/access.service";

export default async function AgamLayout({ children }: { children: ReactNode }) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAnyAgamRole();
  const headerStore = await headers();
  const pathname = (headerStore.get("x-etur-pathname") ?? "/agam").split("?")[0];
  if ("error" in access) {
    redirect(access.status === 401 ? `/login?reason=stale&callbackUrl=${encodeURIComponent(pathname)}` : "/");
  }
  const isCandidate = accessService.isCandidate(access.role);

  if (isCandidate && !pathname.startsWith("/agam/me")) {
    redirect("/agam/me");
  }

  if (isCandidate) {
    return <div className="agam-scope relative min-h-[70vh]">{children}</div>;
  }

  if (accessService.canScreen(access.role)) {
    if (!pathname.startsWith("/agam/evaluate")) {
      const fileId = pathname.match(/^\/agam\/candidates\/([0-9a-f-]{36})/i)?.[1];
      redirect(fileId ? `/agam/evaluate/${fileId}` : "/agam/evaluate");
    }
    return <div className="agam-scope relative min-h-[70vh]">{children}</div>;
  }

  return (
    <div className="agam-scope relative min-h-[70vh] pb-24 md:pb-6 md:ps-[4.75rem] lg:ps-[5.25rem]">
      <AgamSectionNav role={access.role} />
      {children}
    </div>
  );
}
