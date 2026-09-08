import { redirect } from "next/navigation";
import { MalshabimInterviewPage } from "@/modules/malshabim/pages/interview-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }

  const params = await searchParams;
  const accessService = new MalshabimAccessService();

  return (
    <MalshabimInterviewPage
      editId={params.id ?? null}
      canEdit={accessService.canEdit(access.role)}
    />
  );
}
