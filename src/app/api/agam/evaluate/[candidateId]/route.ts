import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamEvaluatorPortalService } from "@/modules/agam/services/evaluator-portal.service";

export async function GET(_request: Request, context: { params: Promise<{ candidateId: string }> }) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { candidateId } = await context.params;
  const view = await new AgamEvaluatorPortalService().candidateView(candidateId, access.profile.id);
  if (!view) {
    return NextResponse.json({ error: "המועמד אינו במחזור הפעיל" }, { status: 404 });
  }
  return NextResponse.json({
    ...view,
    me: { id: access.profile.id, name: access.profile.name, role: access.role },
    canEvaluate: accessService.canEvaluate(access.role),
  });
}
