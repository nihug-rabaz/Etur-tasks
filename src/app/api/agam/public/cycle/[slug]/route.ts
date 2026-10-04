import { NextResponse } from "next/server";
import { AgamCycleService } from "@/modules/agam/services/cycle.service";
import { formatAgamDate } from "@/modules/agam/lib/date-format";
import { checkRateLimit, clientIp } from "@/modules/agam/lib/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const ip = clientIp(request);
  if (!checkRateLimit(`agam-public-cycle:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }

  const { slug } = await context.params;
  const cycle = await new AgamCycleService().getByInviteSlug(decodeURIComponent(slug));
  if (!cycle || cycle.archived) {
    return NextResponse.json({ error: "הקישור אינו פעיל" }, { status: 404 });
  }

  return NextResponse.json({
    cycle: {
      id: cycle.id,
      name: cycle.name,
      cycleDate: cycle.cycle_date,
      cycleDateLabel: formatAgamDate(cycle.cycle_date),
      cohortYear: cycle.cohort_year,
      inviteSlug: cycle.invite_slug,
    },
  });
}
