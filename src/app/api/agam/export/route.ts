import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamDayEvaluationService } from "@/modules/agam/services/evaluation.service";
import { AgamInterviewService } from "@/modules/agam/services/interview.service";

export async function GET() {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canRamad(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [interviews, dayEvals] = await Promise.all([
    new AgamInterviewService().listAll(),
    new AgamDayEvaluationService().listAll(),
  ]);
  return NextResponse.json({ interviews, dayEvals });
}
