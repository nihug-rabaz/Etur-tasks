import { NextResponse } from "next/server";
import { z } from "zod";
import type { DovrutApprovalStatus } from "@/modules/dovrut/types";
import { DovrutApprovalTokenService } from "@/modules/dovrut/services/approval-token.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";

const postSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const tokenService = new DovrutApprovalTokenService();
  const row = await tokenService.getByToken(decodeURIComponent(token));
  if (!row) {
    return NextResponse.json({ error: "קישור לא נמצא" }, { status: 404 });
  }
  if (row.used_at) {
    return NextResponse.json({ error: "הקישור כבר נוצל" }, { status: 410 });
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "הקישור פג תוקף" }, { status: 410 });
  }

  const concept = await new DovrutConceptService().getById(row.concept_id);
  if (!concept || concept.deleted_at || concept.archived_at) {
    return NextResponse.json({ error: "האייטם לא נמצא או בארכיון" }, { status: 404 });
  }

  return NextResponse.json({
    token: {
      approval_step: row.approval_step,
      expires_at: row.expires_at,
    },
    concept: {
      id: concept.id,
      name: concept.name,
      details: concept.details,
      interviewees: concept.interviewees,
      media_outlet: concept.media_outlet,
      approval_status: concept.approval_status,
      step: row.approval_step,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await context.params;
  const token = decodeURIComponent(rawToken);
  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const tokenService = new DovrutApprovalTokenService();
  const claimed = await tokenService.claimToken(token);
  if (!claimed) {
    const existing = await tokenService.getByToken(token);
    if (!existing) {
      return NextResponse.json({ error: "קישור לא נמצא" }, { status: 404 });
    }
    if (existing.used_at) {
      return NextResponse.json({ error: "הקישור כבר נוצל" }, { status: 410 });
    }
    return NextResponse.json({ error: "הקישור פג תוקף" }, { status: 410 });
  }

  const conceptService = new DovrutConceptService();
  const concept = await conceptService.getById(claimed.concept_id);
  if (!concept || concept.deleted_at || concept.archived_at) {
    return NextResponse.json({ error: "האייטם לא נמצא או בארכיון" }, { status: 404 });
  }
  if (concept.approval_status !== claimed.approval_step) {
    return NextResponse.json({ error: "שלב האישור אינו תואם" }, { status: 409 });
  }

  try {
    const updated = await conceptService.applyApproval({
      conceptId: concept.id,
      action: parsed.data.action,
      approvalStep: claimed.approval_step as DovrutApprovalStatus,
      notes: parsed.data.notes,
      rejectionReason: parsed.data.rejectionReason,
      actorName: "אישור ציבורי",
      actorEmail: null,
    });
    return NextResponse.json({
      ok: true,
      concept: {
        id: updated.id,
        name: updated.name,
        approval_status: updated.approval_status,
        work_status_article: updated.work_status_article,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    const status =
      message.includes("mismatch") ||
      message.includes("required") ||
      message.includes("Notes") ||
      message.includes("archived")
        ? 400
        : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
