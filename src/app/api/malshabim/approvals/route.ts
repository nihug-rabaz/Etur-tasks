import { NextResponse } from "next/server";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";

export async function GET() {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const candidates = await new MalshabimCandidateService().listAwaitingApproval();
  return NextResponse.json({ candidates });
}
