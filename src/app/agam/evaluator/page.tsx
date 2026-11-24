import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { AgamEvaluatorLoginPage, type EvaluatorLoginState } from "@/modules/agam/pages/evaluator-login-page";
import { ModuleRoleService } from "@/shared/services/module-role.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "כניסת מעריכים · קצינים",
};

const STAFF_ROLES = new Set(["admin", "ramad", "user", "viewer"]);

export default async function Page() {
  const session = (await getServerSession(authOptions as never)) as Session | null;
  const userId = session?.user?.id;
  const email = session?.user?.email ?? null;

  let state: EvaluatorLoginState = { kind: "signed_out" };
  if (userId) {
    if (!session?.user?.isApproved) {
      state = { kind: "pending", email };
    } else {
      const roles = await new ModuleRoleService().getRolesForUser(userId);
      const agamRole = roles.agam;
      if (session.user.role === "admin" || (agamRole && STAFF_ROLES.has(agamRole))) {
        redirect("/agam/evaluate");
      }
      state = agamRole === "candidate" ? { kind: "candidate", email } : { kind: "no_access", email };
    }
  }

  return <AgamEvaluatorLoginPage state={state} />;
}
