import { NextResponse } from "next/server";
import { Env } from "@/lib/env";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";
import { DovrutProjectService } from "@/modules/dovrut/services/project.service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = Env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const archived = await new DovrutProjectService().completeDueProjects();
  const expiredItems = await new DovrutConceptService().expireUnopened(90);
  return NextResponse.json({ ok: true, archived, expiredItems });
}
