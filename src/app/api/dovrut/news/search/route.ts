import { NextResponse } from "next/server";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutNewsService } from "@/modules/dovrut/services/news.service";

export async function GET(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (access.role === "approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  try {
    const result = await new DovrutNewsService().search({
      q,
      dateFilter: searchParams.get("dateFilter") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      start: Number(searchParams.get("start") ?? "1"),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
