import { redirect } from "next/navigation";
import { MalshabimCandidateFilePage } from "@/modules/malshabim/pages/candidate-file-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    redirect(access.status === 401 ? "/login" : "/");
  }

  const { id } = await params;
  const candidate = await new MalshabimCandidateService().getById(id);
  if (!candidate) {
    redirect("/malshabim");
  }

  return (
    <MalshabimCandidateFilePage
      candidateId={id}
      initialCandidate={candidate}
      initialRole={access.role}
      initialUserName={access.profile.name}
    />
  );
}
