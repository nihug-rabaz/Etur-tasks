import { NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { NotificationService } from "@/services/notification.service";
import { NeonDatabase } from "@/lib/db/neon";
import { Env } from "@/lib/env";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = Env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = NeonDatabase.createClient();
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const from = startOfDay(now).toISOString();
  const to = endOfDay(tomorrow).toISOString();

  const rows = await sql<
    Array<{
      title: string;
      due_date: string | null;
      subtopic_name: string | null;
      telegram_id: string | null;
      user_name: string;
    }>
  >`
    select
      td.title,
      td.due_date,
      td.subtopic_name,
      p.telegram_id,
      p.name as user_name
    from task_details td
    join task_assignees ta on ta.task_id = td.id
    join profiles p on p.id = ta.user_id
    where td.due_date >= ${from}
      and td.due_date <= ${to}
      and td.status <> 'completed'
      and p.telegram_id is not null
  `;

  const notificationService = new NotificationService();
  let sent = 0;
  for (const row of rows) {
    if (!row.telegram_id) continue;
    await notificationService.sendTaskAssignedMessage({
      telegramId: row.telegram_id,
      title: row.title,
      subtopic: row.subtopic_name ?? "Unknown",
      dueDate: row.due_date,
      assignee: row.user_name,
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
