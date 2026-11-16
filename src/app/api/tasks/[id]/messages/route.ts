import { NextResponse } from "next/server";
import { z } from "zod";
import { NeonDatabase } from "@/lib/db/neon";
import { AuthorizationService } from "@/services/authorization.service";
import { NotificationService } from "@/services/notification.service";
import { TaskMessageService } from "@/services/task-message.service";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const allowed = await authorizationService.canAccessTask(profile, taskId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await new TaskMessageService().listByTask(taskId);
  return NextResponse.json({ messages, currentUserId: profile.id });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const allowed = await authorizationService.canAccessTask(profile, taskId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const message = await new TaskMessageService().create(taskId, profile.id, parsed.data.body);

    try {
      const db = NeonDatabase.createClient();
      const taskRows = await db<
        Array<{ title: string; created_by: string | null }>
      >`
        select title, created_by from tasks where id = ${taskId} limit 1
      `;
      const assigneeRows = await db<Array<{ user_id: string }>>`
        select user_id from task_assignees where task_id = ${taskId}
      `;
      const recipientIds = [
        ...assigneeRows.map((row) => row.user_id),
        taskRows[0]?.created_by,
      ].filter((id): id is string => Boolean(id));

      await new NotificationService().notifyTaskMessage({
        taskId,
        title: taskRows[0]?.title || "משימה",
        body: parsed.data.body,
        authorId: profile.id,
        authorName: profile.name || "משתמש",
        recipientIds,
      });
    } catch (error) {
      console.error("[task-message-notify]", taskId, error);
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
}
