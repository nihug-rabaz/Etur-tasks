import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutApprovalReminderService } from "@/modules/dovrut/services/approval-reminder.service";

const schema = z.object({
  approvalStatus: z.enum([
    "waiting_branch_head",
    "waiting_deputy_commander",
    "waiting_chief_rabbi",
  ]),
  userIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const result = await new DovrutApprovalReminderService().sendTelegramReminders(
    parsed.data.approvalStatus,
    parsed.data.userIds,
  );
  return NextResponse.json(result);
}
