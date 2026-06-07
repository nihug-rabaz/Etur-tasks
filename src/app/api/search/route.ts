import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { SearchService } from "@/services/search.service";

export async function GET(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const access = await authorizationService.getTaskAccessContext(profile);
  const results = await new SearchService().search(access, query);
  return NextResponse.json(results);
}
