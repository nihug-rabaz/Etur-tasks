import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new AgamAccessService().requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { id } = await context.params;
  const service = new AgamCycleService();
  if (!(await service.getById(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ board: await service.stageBoard(id) });
}
