import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const db = NeonDatabase.createClient();
  const rows = await db<Array<{ subtopic_id: string }>>`
    select subtopic_id
    from tasks
    where id = ${id}
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

  const details = await db<
    Array<{
      id: string;
      title: string;
      description: string | null;
      subtopic_id: string;
      project_id: string | null;
      assigned_to: string | null;
      created_by: string;
      priority: "low" | "medium" | "high";
      status: "open" | "in_progress" | "completed";
      due_date: string | null;
      created_at: string;
      updated_at: string;
      subtopic_name: string | null;
      domain_name: string | null;
      project_name: string | null;
      assignee_name: string | null;
      assignee_ids: string[] | null;
    }>
  >`
    select
      id,
      title,
      description,
      subtopic_id,
      project_id,
      assigned_to,
      created_by,
      priority,
      status,
      due_date,
      created_at,
      updated_at,
      subtopic_name,
      domain_name,
      project_name,
      assignee_name,
      assignee_ids
    from task_details
    where id = ${id}
    limit 1
  `;

  return NextResponse.json({ task: details[0] ?? null });
}

