import { redirect } from "next/navigation";
import { isMalshabimCandidateApprover } from "@/modules/malshabim/lib/approvers";
import { redirectMalshabimLogin } from "@/modules/malshabim/lib/auth-redirect";
import { MalshabimCandidateFilePage } from "@/modules/malshabim/pages/candidate-file-page";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const access = await new MalshabimAccessService().requireMalshabimAccess();
  if ("error" in access) {
    if (access.status === 401) await redirectMalshabimLogin("/malshabim");
    redirect("/");
  }

  const { id } = await params;
  const candidate = await new MalshabimCandidateService().getById(id);
  if (!candidate) {
    redirect("/malshabim");
  }

  // Neon returns date/timestamptz as Date objects; JSON round-trip matches the
  // API shape (ISO strings) so client render never receives raw Date children.
  const initialCandidate = JSON.parse(JSON.stringify(candidate)) as typeof candidate;

  return (
    <MalshabimCandidateFilePage
      candidateId={id}
      initialCandidate={initialCandidate}
      initialRole={access.role}
      initialUserName={access.profile.name}
      initialCanApprove={isMalshabimCandidateApprover(access.profile)}
    />
  );
}
