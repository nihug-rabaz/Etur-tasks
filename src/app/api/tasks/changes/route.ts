import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { TaskService } from "@/services/task.service";

export async function GET(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sinceRaw = searchParams.get("since");
  const sinceMs = sinceRaw ? Date.parse(sinceRaw) : Number.NaN;
  const since = Number.isFinite(sinceMs)
    ? new Date(sinceMs)
    : new Date(Date.now() - 30_000);

  // Cap lookback to avoid huge first payloads.
  const minSince = new Date(Date.now() - 10 * 60_000);
  const effectiveSince = since < minSince ? minSince : since;

  const access = await authorizationService.getTaskAccessContext(profile);
  const changes = await new TaskService().getChangesSince(access, effectiveSince, 100);
  const newest = changes.reduce((max, row) => {
    const ts = Date.parse(row.updated_at);
    return Number.isFinite(ts) && ts > max ? ts : max;
  }, effectiveSince.getTime());

  return NextResponse.json({
    changes,
    cursor: new Date(newest).toISOString(),
    serverTime: new Date().toISOString(),
  });
}
