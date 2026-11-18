import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateMeService } from "@/modules/agam/services/candidate-me.service";
import { AgamCandidateExamService } from "@/modules/agam/services/candidate-exam.service";

export async function GET() {
  const access = await new AgamAccessService().requireCandidateAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const meService = new AgamCandidateMeService();
  const candidate = await meService.resolveForUser(access.profile.id, access.profile.email);
  if (!candidate) {
    return NextResponse.json({ error: "לא נמצא תיק מועמד" }, { status: 404 });
  }

  const exams = await new AgamCandidateExamService().buildBoard(candidate);
  return NextResponse.json({ exams });
}
