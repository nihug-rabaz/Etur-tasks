import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateMeService } from "@/modules/agam/services/candidate-me.service";

export async function GET() {
  const access = await new AgamAccessService().requireCandidateAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const meService = new AgamCandidateMeService();
  const candidate = await meService.resolveForUser(access.profile.id, access.profile.email);
  if (!candidate) {
    return NextResponse.json(
      { error: "לא נמצא תיק מועמד המקושר לחשבון זה. התחברו עם אותו מייל שנרשמתם בשאלון." },
      { status: 404 },
    );
  }

  const payload = await meService.buildPayload(candidate);
  return NextResponse.json(payload);
}
