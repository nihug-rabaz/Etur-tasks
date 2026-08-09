import { NextResponse } from "next/server";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";
import { DovrutProjectService } from "@/modules/dovrut/services/project.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const concept = await new DovrutConceptService().getById(id);
  if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const project = await new DovrutProjectService().getById(concept.project_id);
  return NextResponse.json({ concept, project });
}
