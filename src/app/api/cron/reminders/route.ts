import { NextResponse } from "next/server";
import { NotificationService } from "@/services/notification.service";
import { NeonDatabase } from "@/lib/db/neon";
import { Env } from "@/lib/env";

const ISRAEL_TZ = "Asia/Jerusalem";
const DAILY_SUMMARY_HOURS = { from: 7, to: 9 };
const TOMORROW_REMINDER_HOURS = { from: 8, to: 20 };

function jerusalemNowParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
  return {
    dayKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number.parseInt(map.hour, 10),
  };
}

function isWithinWindow(hour: number, range: { from: number; to: number }): boolean {
  return hour >= range.from && hour <= range.to;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = Env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = NeonDatabase.createClient();
  const now = new Date();
  const { dayKey, hour } = jerusalemNowParts(now);
  const result: {
    ok: true;
    israelHour: number;
    dayKey: string;
    dueTomorrowSent: number;
    dailySummarySent: number;
    skipped: string[];
  } = {
    ok: true,
    israelHour: hour,
    dayKey,
    dueTomorrowSent: 0,
    dailySummarySent: 0,
    skipped: [],
  };

  const notificationService = new NotificationService();

  if (isWithinWindow(hour, TOMORROW_REMINDER_HOURS)) {
    const tomorrowRows = await sql<
      Array<{
        id: string;
        title: string;
        due_date: string | null;
        subtopic_name: string | null;
        user_id: string;
      }>
    >`
      select
        td.id,
        td.title,
        td.due_date,
        td.subtopic_name,
        ta.user_id
      from task_details td
      join task_assignees ta on ta.task_id = td.id
      join profiles p on p.id = ta.user_id
      where (td.due_date at time zone ${ISRAEL_TZ})::date
            = ((now() at time zone ${ISRAEL_TZ})::date + interval '1 day')::date
        and td.status <> 'completed'
        and p.telegram_id is not null
    `;

    const tomorrowTasks = new Map<
      string,
      {
        title: string;
        dueDate: string | null;
        subtopic: string;
        assigneeIds: string[];
      }
    >();
    for (const row of tomorrowRows) {
      const item = tomorrowTasks.get(row.id) ?? {
        title: row.title,
        dueDate: row.due_date,
        subtopic: row.subtopic_name ?? "לא ידוע",
        assigneeIds: [],
      };
      item.assigneeIds.push(row.user_id);
      tomorrowTasks.set(row.id, item);
    }
    for (const [taskId, task] of tomorrowTasks) {
      result.dueTomorrowSent += await notificationService.notifyTaskDueTomorrow({
        taskId,
        title: task.title,
        subtopic: task.subtopic,
        dueDate: task.dueDate,
        assigneeIds: task.assigneeIds,
      });
    }
  } else {
    result.skipped.push("dueTomorrow");
  }

  if (isWithinWindow(hour, DAILY_SUMMARY_HOURS)) {
    const todayRows = await sql<
      Array<{
        id: string;
        title: string;
        due_date: string | null;
        subtopic_name: string | null;
        user_id: string;
        user_name: string;
      }>
    >`
      select
        td.id,
        td.title,
        td.due_date,
        td.subtopic_name,
        p.id as user_id,
        p.name as user_name
      from task_details td
      join task_assignees ta on ta.task_id = td.id
      join profiles p on p.id = ta.user_id
      where (td.due_date at time zone ${ISRAEL_TZ})::date
            = (now() at time zone ${ISRAEL_TZ})::date
        and td.status <> 'completed'
        and p.telegram_id is not null
      order by p.name, td.due_date asc nulls last, td.title
    `;

    const todayByUser = new Map<
      string,
      {
        userName: string;
        tasks: Array<{ id: string; title: string; dueDate: string | null; subtopic: string | null }>;
      }
    >();
    for (const row of todayRows) {
      const item = todayByUser.get(row.user_id) ?? { userName: row.user_name, tasks: [] };
      item.tasks.push({
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        subtopic: row.subtopic_name,
      });
      todayByUser.set(row.user_id, item);
    }
    for (const [userId, item] of todayByUser) {
      result.dailySummarySent += await notificationService.notifyDailyTaskList({
        userId,
        userName: item.userName,
        tasks: item.tasks,
        dayKey,
      });
    }
  } else {
    result.skipped.push("dailySummary");
  }

  return NextResponse.json(result);
}
