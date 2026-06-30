import { NextResponse } from "next/server";
import { AppSettingsService, isWithinMorningSummaryWindow } from "@/services/app-settings.service";
import { NotificationService } from "@/services/notification.service";
import { NeonDatabase } from "@/lib/db/neon";
import { Env } from "@/lib/env";
import { formatScheduleTime } from "@/lib/dates/schedule-range";

const ISRAEL_TZ = "Asia/Jerusalem";
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
    minute: Number.parseInt(map.minute, 10),
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
  const { dayKey, hour, minute } = jerusalemNowParts(now);
  const morningMessageTime = await new AppSettingsService().getMorningMessageTime();
  const result: {
    ok: true;
    israelHour: number;
    israelMinute: number;
    morningMessageTime: string;
    dayKey: string;
    dueTomorrowSent: number;
    dailySummarySent: number;
    skipped: string[];
  } = {
    ok: true,
    israelHour: hour,
    israelMinute: minute,
    morningMessageTime,
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

  if (isWithinMorningSummaryWindow(hour, minute, morningMessageTime)) {
    const todayTaskRows = await sql<
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

    const todayScheduleRows = await sql<
      Array<{
        id: string;
        title: string;
        starts_at: string;
        ends_at: string | null;
        all_day: boolean;
        subtopic_name: string | null;
        user_id: string;
        user_name: string;
      }>
    >`
      select
        ce.id,
        ce.title,
        ce.starts_at,
        ce.ends_at,
        ce.all_day,
        ced.subtopic_name,
        p.id as user_id,
        p.name as user_name
      from calendar_event_details ced
      join calendar_events ce on ce.id = ced.id
      join calendar_event_participants cep on cep.event_id = ce.id
      join profiles p on p.id = cep.user_id
      where ce.cancelled_at is null
        and (ce.starts_at at time zone ${ISRAEL_TZ})::date <= (now() at time zone ${ISRAEL_TZ})::date
        and coalesce((ce.ends_at at time zone ${ISRAEL_TZ})::date, (ce.starts_at at time zone ${ISRAEL_TZ})::date)
            >= (now() at time zone ${ISRAEL_TZ})::date
        and p.telegram_id is not null
      order by p.name, ce.starts_at asc, ce.title
    `;

    const todayByUser = new Map<
      string,
      {
        userName: string;
        items: Array<{
          id: string;
          title: string;
          subtopic: string | null;
          timeLabel: string;
          kind: "task" | "schedule";
          sortAt: string;
        }>;
      }
    >();

    for (const row of todayTaskRows) {
      const item = todayByUser.get(row.user_id) ?? { userName: row.user_name, items: [] };
      item.items.push({
        id: row.id,
        title: row.title,
        subtopic: row.subtopic_name,
        timeLabel: row.due_date
          ? new Date(row.due_date).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
          : "ללא שעה",
        kind: "task",
        sortAt: row.due_date ?? "9999",
      });
      todayByUser.set(row.user_id, item);
    }

    for (const row of todayScheduleRows) {
      const item = todayByUser.get(row.user_id) ?? { userName: row.user_name, items: [] };
      item.items.push({
        id: row.id,
        title: row.title,
        subtopic: row.subtopic_name,
        timeLabel: formatScheduleTime(row),
        kind: "schedule",
        sortAt: row.starts_at,
      });
      todayByUser.set(row.user_id, item);
    }

    for (const [userId, item] of todayByUser) {
      const sorted = item.items.sort((a, b) => a.sortAt.localeCompare(b.sortAt));
      result.dailySummarySent += await notificationService.notifyDailyDigest({
        userId,
        userName: item.userName,
        dayKey,
        items: sorted.map(({ sortAt: _sortAt, ...rest }) => rest),
      });
    }
  } else {
    result.skipped.push("dailySummary");
  }

  return NextResponse.json(result);
}
