import { NextResponse } from "next/server";
import { z } from "zod";
import { NeonDatabase } from "@/lib/db/neon";
import { isMalshabimCandidateApprover } from "@/modules/malshabim/lib/approvers";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";
import { NotificationService } from "@/services/notification.service";

const postSchema = z.object({
  action: z.enum(["approve", "reject", "notes"]),
  notes: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await new MalshabimAccessService().requireMalshabimAccess("admin");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!isMalshabimCandidateApprover(access.profile)) {
    return NextResponse.json(
      { error: "רק ישראל או הרב קובי יכולים לאשר או לשלוח הערות" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const service = new MalshabimCandidateService();
  const existing = await service.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const approverName = access.profile.name || "מנהל";
  const action = parsed.data.action;

  if (action === "notes") {
    const notes = (parsed.data.notes ?? "").trim();
    if (!notes) {
      return NextResponse.json({ error: "נא להזין הערות" }, { status: 400 });
    }

    const logEntry = {
      date: now,
      changes: `הערות מנהל: ${notes}`,
      updated_by: approverName,
    };

    const previousLog = Array.isArray(existing.update_log)
      ? existing.update_log
      : [];
    // Keep the file in "מחכים לאישור מנהל" until approve/reject.
    const candidate = await service.update(id, {
      awaiting_admin_approval: true,
      update_log: [...previousLog, logEntry],
    });

    const recipientUserId =
      existing.created_by || existing.interviewer_user_id || null;
    if (recipientUserId && recipientUserId !== access.profile.id) {
      try {
        let recipientEmail: string | null = null;
        let recipientName: string | null = existing.created_by_name ?? null;
        const db = NeonDatabase.createClient();
        const rows = await db<Array<{ email: string | null; name: string | null }>>`
          select email, name from profiles where id = ${recipientUserId} limit 1
        `;
        recipientEmail = rows[0]?.email ?? null;
        recipientName = recipientName || rows[0]?.name || null;

        await new NotificationService().notifyMalshabimApprovalNotes({
          candidateId: existing.id,
          fullName: existing.full_name || "מועמד",
          notes,
          approverName,
          recipientUserId,
          recipientEmail,
          recipientName,
        });
      } catch (error) {
        console.error("[malshabim-approval-notes-notify]", id, error);
      }
    }

    return NextResponse.json({ candidate });
  }

  const approved = action === "approve";
  // Do not upgrade an interviewer "לא אושר" decision to approved.
  const status = approved
    ? existing.candidate_status === "לא אושר"
      ? "לא אושר"
      : "אושר ולא שובץ"
    : "לא אושר";
  const logEntry = {
    date: now,
    changes: approved
      ? status === "לא אושר"
        ? "אישור מנהל — נשמר לא אושר"
        : "אישור מנהל — אושר ולא שובץ"
      : "דחיית אישור מנהל — לא אושר",
    updated_by: approverName,
  };

  const previousLog = Array.isArray(existing.update_log)
    ? existing.update_log
    : [];
  const candidate = await service.update(id, {
    awaiting_admin_approval: false,
    candidate_status: status,
    update_log: [...previousLog, logEntry],
  });

  return NextResponse.json({ candidate });
}
