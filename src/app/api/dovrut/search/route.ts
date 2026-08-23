import { NextResponse } from "next/server";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutSearchService } from "@/modules/dovrut/services/search.service";
import { AuthorizationService } from "@/services/authorization.service";

const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };

export async function GET(request: Request) {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const taskAccess = await new AuthorizationService().getTaskAccessContext(access.profile);
  const results = await new DovrutSearchService().search(query, taskAccess);
  return NextResponse.json(results, noStore);
}
