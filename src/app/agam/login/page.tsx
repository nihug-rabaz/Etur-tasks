import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { AgamCandidateLoginPage, type CandidateLoginState } from "@/modules/agam/pages/candidate-login-page";
import { AgamCandidateLinkService } from "@/modules/agam/services/candidate-link.service";
import { AgamCandidateMeService } from "@/modules/agam/services/candidate-me.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = (await getServerSession(authOptions as never)) as Session | null;
  const userId = session?.user?.id;
  const email = session?.user?.email ?? null;

  let state: CandidateLoginState = { kind: "signed_out" };
  if (userId) {
    // Retry the link in case staff fixed the candidate's email after this account first signed in.
    if (email) {
      await new AgamCandidateLinkService().linkByEmail(email, userId).catch(() => false);
    }
    const candidate = await new AgamCandidateMeService().resolveForUser(userId, email);
    if (candidate) redirect("/agam/me");
    state = session?.user?.isApproved ? { kind: "staff", email } : { kind: "unmatched", email };
  }

  return <AgamCandidateLoginPage state={state} />;
}
