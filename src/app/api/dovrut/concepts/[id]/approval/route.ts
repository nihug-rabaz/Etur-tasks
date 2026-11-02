import { NextResponse } from "next/server";
import { z } from "zod";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";

const schema = z
  .object({
    action: z.enum(["approve", "reject"]),
    approvalStep: z.enum([
      "waiting_spokesperson_officer",
      "waiting_branch_head",
      "waiting_deputy_commander",
      "waiting_chief_rabbi",
      "waiting_command_rabbi",
      "approved",
    ]),
    notes: z.string().min(1),
    rejectionReason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "reject" && !(data.rejectionReason?.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason is required when rejecting",
        path: ["rejectionReason"],
      });
    }
  });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canApprove(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  try {
    const concept = await new DovrutConceptService().applyApproval({
      conceptId: id,
      action: parsed.data.action,
      approvalStep: parsed.data.approvalStep,
      notes: parsed.data.notes,
      rejectionReason: parsed.data.rejectionReason,
      actorName: access.profile.name,
      actorEmail: access.profile.email,
    });
    return NextResponse.json({ concept });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    const status =
      message.includes("mismatch") ||
      message.includes("required") ||
      message.includes("Notes")
        ? 400
        : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
