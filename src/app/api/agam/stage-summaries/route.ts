import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamStageSummaryService } from "@/modules/agam/services/stage-summary.service";
import type { AgamStageKey } from "@/modules/agam/types";

const STAGES: AgamStageKey[] = [
  "day_selection",
  "preparation_day",
  "smach",
  "documents",
  "final_decision",
];

export async function GET(request: Request) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const stage = new URL(request.url).searchParams.get("stage") as AgamStageKey | null;
  if (!stage || !STAGES.includes(stage)) {
    return NextResponse.json({ error: "missing stage" }, { status: 400 });
  }
  const map = await new AgamStageSummaryService().loadMap(stage);
  return NextResponse.json({ map });
}
