import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";
import { NotificationService } from "@/services/notification.service";
import { SubtopicLinkService } from "@/services/subtopic-link.service";
import { resolveSubtopicIds } from "@/lib/subtopics/validation";

const taskSchema = z.object({
  title: z.string().min(1),
  subtopicId: z.string().uuid().optional(),
  subtopicIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().nullable().optional(),
  assignedToIds: z.array(z.string().uuid()).optional().default([]),
  dueDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
});

const taskPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["in_progress", "completed"]).optional(),
  title: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assignedToIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().nullable().optional(),
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
  const subtopicIds = resolveSubtopicIds(payload);
  if (subtopicIds.length === 0) {
    return NextResponse.json({ error: "At least one subtopic is required" }, { status: 400 });
  }
  if (profile.role !== "admin") {
    const allowed = await authorizationService.canAccessAllSubtopics(profile.id, subtopicIds);
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
      ${subtopicIds[0]},
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
  await new SubtopicLinkService().syncTaskSubtopics(taskId, subtopicIds);
  if (payload.assignedToIds.length > 0) {
    for (const userId of payload.assignedToIds) {
      await db`
        insert into task_assignees (task_id, user_id)
        values (${taskId}, ${userId})
        on conflict (task_id, user_id) do nothing
      `;
    }
  }

  const subtopicRows = await db<Array<{ name: string }>>`
    select name from subtopics where id = any(${subtopicIds}) order by name
  `;
  const notificationService = new NotificationService();
  await notificationService.notifyTaskOpened({
    taskId,
    title: payload.title,
    subtopic: subtopicRows.map((row) => row.name).join(", ") || "לא ידוע",
    dueDate: payload.dueDate ?? null,
    assigneeIds: payload.assignedToIds,
    creatorId: profile.id,
  });

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

  const allowed = await authorizationService.canAccessTask(profile, payload.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = NeonDatabase.createClient();

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
  if (payload.projectId !== undefined) {
    if (payload.projectId === null) {
      await db`
        update tasks
        set project_id = null, updated_at = now()
        where id = ${payload.id}
      `;
    } else {
      const subtopicLinkService = new SubtopicLinkService();
      const projectSubtopicIds = await subtopicLinkService.getProjectSubtopicIds(payload.projectId);
      const targetSubtopicId = projectSubtopicIds[0];
      if (!targetSubtopicId) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (profile.role !== "admin") {
        const canAccessTarget = await authorizationService.canAccessProject(profile, payload.projectId);
        if (!canAccessTarget) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      await db`
        update tasks
        set project_id = ${payload.projectId}, subtopic_id = ${targetSubtopicId}, updated_at = now()
        where id = ${payload.id}
      `;
      await subtopicLinkService.syncTaskSubtopics(payload.id, projectSubtopicIds);
    }
  }

  return NextResponse.json({ ok: true });
}
