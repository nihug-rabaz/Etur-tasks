import { redirect } from "next/navigation";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimInterviewPage } from "@/modules/malshabim/pages/interview-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";

interface PageProps {
  searchParams: Promise<{ id?: string; waitlistId?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    if (access.status === 401) await redirectMalshabimLogin("/malshabim/interview");
    redirect("/");
  }

  const params = await searchParams;
  const accessService = new MalshabimAccessService();

  return (
    <MalshabimInterviewPage
      editId={params.id ?? null}
      waitlistId={params.waitlistId ?? null}
      canEdit={accessService.canEdit(access.role)}
    />
  );
}
