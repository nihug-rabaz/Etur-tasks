import { NextResponse } from "next/server";
import { Env } from "@/lib/env";
import { DovrutNewsWatchService } from "@/modules/dovrut/services/news-watch.service";

const ISRAEL_TZ = "Asia/Jerusalem";

function israelHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number.parseInt(hour, 10);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = Env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hour = israelHour(new Date());
  // 07:00 inclusive … 22:00 exclusive (Israel)
  if (hour < 7 || hour >= 22) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_hours",
      israelHour: hour,
    });
  }

  const result = await new DovrutNewsWatchService().runScheduledSearch();
  return NextResponse.json({ ok: true, skipped: false, israelHour: hour, ...result });
}
