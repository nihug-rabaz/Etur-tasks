import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { NotificationService } from "@/services/notification.service";
import { TaskCloseRequestService } from "@/services/task-close-request.service";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "cancel"]),
  reviewNote: z.string().max(500).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const service = new TaskCloseRequestService();
  const notifications = new NotificationService();

  try {
    if (parsed.data.action === "cancel") {
      await service.cancelRequest(id, profile.id);
      return NextResponse.json({ ok: true });
    }

    if (!authorizationService.canCloseTask(profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parsed.data.action === "approve") {
      const result = await service.approveRequest(id, profile.id);
      await notifications.notifyTaskCloseDecision({
        taskId: result.task_id,
        title: result.task_title ?? "משימה",
        requesterId: result.requested_by,
        approved: true,
      });
      return NextResponse.json({ request: result });
    }

    const result = await service.rejectRequest(id, profile.id, parsed.data.reviewNote);
    await notifications.notifyTaskCloseDecision({
      taskId: result.task_id,
      title: result.task_title ?? "משימה",
      requesterId: result.requested_by,
      approved: false,
      reviewNote: result.review_note,
    });
    return NextResponse.json({ request: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "REQUEST_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
