import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";
import { NotificationService } from "@/services/notification.service";

const taskSchema = z.object({
  title: z.string().min(1),
  subtopicId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  assignedToIds: z.array(z.string().uuid()).optional().default([]),
  dueDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["open", "in_progress", "completed"]).default("open"),
});

const taskPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "completed"]).optional(),
  title: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assignedToIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = taskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const payload = parsed.data;
  if (profile.role !== "admin") {
    const allowed = await authorizationService.canAccessSubtopic(profile.id, payload.subtopicId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const db = NeonDatabase.createClient();
  const primaryAssignee = payload.assignedToIds[0] ?? null;
  const rows = await db<Array<{ id: string }>>`
    insert into tasks (title, description, subtopic_id, project_id, assigned_to, created_by, priority, status, due_date)
    values (
      ${payload.title},
      ${payload.description ?? null},
      ${payload.subtopicId},
      ${payload.projectId ?? null},
      ${primaryAssignee},
      ${profile.id},
      ${payload.priority},
      ${payload.status},
      ${payload.dueDate ?? null}
    )
    returning id
  `;

  const taskId = rows[0]?.id;
  if (!taskId) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
  if (payload.assignedToIds.length > 0) {
    for (const userId of payload.assignedToIds) {
      await db`
        insert into task_assignees (task_id, user_id)
        values (${taskId}, ${userId})
        on conflict (task_id, user_id) do nothing
      `;
    }
  }

  if (payload.assignedToIds.length > 0) {
    const subtopicRows = await db<Array<{ name: string }>>`
      select name from subtopics where id = ${payload.subtopicId} limit 1
    `;
    const subtopicLabel = subtopicRows[0]?.name ?? "לא ידוע";
    const notificationService = new NotificationService();
    const notified = new Set<string>();
    for (const userId of payload.assignedToIds) {
      const assigneeRows = await db<Array<{ name: string; telegram_id: string | null }>>`
        select name, telegram_id from profiles where id = ${userId} limit 1
      `;
      const assignee = assigneeRows[0];
      if (!assignee?.telegram_id || notified.has(assignee.telegram_id)) continue;
      notified.add(assignee.telegram_id);
      await notificationService.sendTaskAssignedMessage({
        telegramId: assignee.telegram_id,
        title: payload.title,
        subtopic: subtopicLabel,
        dueDate: payload.dueDate ?? null,
        assignee: assignee.name,
      });
    }
  }

  return NextResponse.json({ id: taskId });
}

export async function PATCH(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = taskPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const payload = parsed.data;

  const db = NeonDatabase.createClient();
  const rows = await db<Array<{ subtopic_id: string }>>`
    select subtopic_id
    from tasks
    where id = ${payload.id}
    limit 1
  `;
  const task = rows[0];
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (profile.role !== "admin") {
    const allowed = await authorizationService.canAccessSubtopic(profile.id, task.subtopic_id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (payload.status !== undefined) {
    await db`
      update tasks
      set status = ${payload.status}, updated_at = now()
      where id = ${payload.id}
    `;
  }
  if (payload.title !== undefined) {
    await db`
      update tasks
      set title = ${payload.title}, updated_at = now()
      where id = ${payload.id}
    `;
  }
  if (payload.priority !== undefined) {
    await db`
      update tasks
      set priority = ${payload.priority}, updated_at = now()
      where id = ${payload.id}
    `;
  }
  if (payload.description !== undefined) {
    await db`
      update tasks
      set description = ${payload.description}, updated_at = now()
      where id = ${payload.id}
    `;
  }
  if (payload.dueDate !== undefined) {
    await db`
      update tasks
      set due_date = ${payload.dueDate}, updated_at = now()
      where id = ${payload.id}
    `;
  }
  if (payload.assignedToIds !== undefined) {
    const ids = payload.assignedToIds;
    const primaryAssignee = ids[0] ?? null;
    await db`
      update tasks
      set assigned_to = ${primaryAssignee}, updated_at = now()
      where id = ${payload.id}
    `;
    await db`delete from task_assignees where task_id = ${payload.id}`;
    for (const userId of ids) {
      await db`
        insert into task_assignees (task_id, user_id)
        values (${payload.id}, ${userId})
        on conflict (task_id, user_id) do nothing
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
