import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { NotificationService } from "@/services/notification.service";
import { TaskCloseRequestService } from "@/services/task-close-request.service";

const createSchema = z.object({
  taskId: z.string().uuid(),
  note: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const service = new TaskCloseRequestService();
  const requests = authorizationService.canCloseTask(profile)
    ? await service.listPending()
    : await service.listPendingForUser(profile.id);

  return NextResponse.json({
    canClose: authorizationService.canCloseTask(profile),
    requests,
  });
}

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }
  if (authorizationService.canCloseTask(profile)) {
    return NextResponse.json({ error: "Admins can close tasks directly" }, { status: 400 });
  }

  const json = await request.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const allowed = await authorizationService.canAccessTask(profile, parsed.data.taskId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = new TaskCloseRequestService();
  try {
    const created = await service.createRequest({
      taskId: parsed.data.taskId,
      requestedBy: profile.id,
      note: parsed.data.note,
    });
    await new NotificationService().notifyTaskCloseRequested({
      taskId: created.task_id,
      title: created.task_title ?? "משימה",
      requesterName: created.requester_name ?? profile.name,
      note: created.note,
    });
    return NextResponse.json({ request: created });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "TASK_ALREADY_COMPLETED") {
      return NextResponse.json({ error: "Task already completed" }, { status: 409 });
    }
    if (code === "REQUEST_ALREADY_PENDING") {
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });
    }
    if (code === "TASK_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
