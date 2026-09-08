import { NextResponse } from "next/server";
import { AppSettingsService, isMorningSummaryDue } from "@/services/app-settings.service";
import { DailyPlanService } from "@/services/daily-plan.service";
import { NotificationService } from "@/services/notification.service";
import { NeonDatabase } from "@/lib/db/neon";
import { Env } from "@/lib/env";

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

function formatPlanTime(startMinute: number): string {
  const hour = Math.floor(startMinute / 60);
  const minute = startMinute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
        and p.is_approved = true
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

  if (isMorningSummaryDue(hour, minute, morningMessageTime)) {
    const dailyPlanService = new DailyPlanService();
    const linkedUsers = await sql<Array<{ id: string; name: string }>>`
      select id, name from profiles
      where is_approved = true
      order by name
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

    for (const user of linkedUsers) {
      todayByUser.set(user.id, { userName: user.name, items: [] });
    }

    await Promise.all(linkedUsers.map((user) => dailyPlanService.rolloverIncompleteSlots(user.id, dayKey)));

    const dailyPlanRows = await sql<
      Array<{
        id: string;
        title: string;
        subtopic_name: string | null;
        user_id: string;
        user_name: string;
        start_minute: number;
        is_done: boolean;
      }>
    >`
      select
        t.id,
        t.title,
        s.name as subtopic_name,
        p.id as user_id,
        p.name as user_name,
        udps.start_minute,
        udps.is_done
      from user_daily_plan_slots udps
      join tasks t on t.id = udps.task_id
      join subtopics s on s.id = t.subtopic_id
      join profiles p on p.id = udps.user_id
      where udps.plan_date = ${dayKey}::date
        and t.status <> 'completed'
        and p.is_approved = true
      order by p.name, udps.is_done asc, udps.start_minute asc, t.title
    `;

    for (const row of dailyPlanRows) {
      const item = todayByUser.get(row.user_id) ?? { userName: row.user_name, items: [] };
      item.items.push({
        id: row.id,
        title: row.title,
        subtopic: row.subtopic_name,
        timeLabel: row.is_done ? `${formatPlanTime(row.start_minute)} · בוצע` : formatPlanTime(row.start_minute),
        kind: "task",
        sortAt: `${row.is_done ? 1 : 0}:${String(row.start_minute).padStart(4, "0")}:${row.title}`,
      });
      todayByUser.set(row.user_id, item);
    }

    for (const [userId, item] of todayByUser) {
      const sorted = item.items.sort((a, b) => a.sortAt.localeCompare(b.sortAt));
      result.dailySummarySent += await notificationService.notifyDailyDigest({
        userId,
        userName: item.userName,
        dayKey,
        items: sorted.map((digestItem) => ({
          id: digestItem.id,
          title: digestItem.title,
          subtopic: digestItem.subtopic,
          timeLabel: digestItem.timeLabel,
          kind: digestItem.kind,
        })),
      });
    }
  } else {
    result.skipped.push("dailySummary");
  }

  return NextResponse.json(result);
}
