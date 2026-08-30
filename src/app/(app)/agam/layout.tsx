import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AgamSectionNav } from "@/modules/agam/components/section-nav";
import { AgamAccessService } from "@/modules/agam/services/access.service";

export default async function AgamLayout({ children }: { children: ReactNode }) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }

  return (
    <>
      <AgamSectionNav role={access.role} />
      {children}
    </>
  );
}
