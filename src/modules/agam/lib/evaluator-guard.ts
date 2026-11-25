import "server-only";
import { redirect } from "next/navigation";
import { AgamAccessService } from "@/modules/agam/services/access.service";

/**
 * Evaluators (ממיינים) only use the evaluator portal. Page-level because the Agam layout
 * is not re-rendered on client-side navigation between Agam pages.
 */
export async function keepEvaluatorsInPortal(candidateId?: string): Promise<void> {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAnyAgamRole();
  if (!("error" in access) && accessService.canScreen(access.role)) {
    redirect(candidateId ? `/agam/evaluate/${candidateId}` : "/agam/evaluate");
  }
}
