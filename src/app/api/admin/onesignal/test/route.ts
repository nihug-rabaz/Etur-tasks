import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationService } from "@/services/authorization.service";
import { NotificationImageService } from "@/services/notification-image.service";
import { OneSignalService } from "@/services/onesignal.service";
import { OneSignalServerConfig } from "@/lib/onesignal/onesignal-server-config";
import { UserService } from "@/services/user.service";
import { NeonDatabase } from "@/lib/db/neon";

const bodySchema = z.object({
  userId: z.string().uuid(),
  withTodolistImage: z.boolean().optional(),
});

function formatPlanTime(startMinute: number): string {
  const hour = Math.floor(startMinute / 60);
  const minute = startMinute % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export async function GET() {
  const profile = await new AuthorizationService().ensureRealAdminApi();
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = new OneSignalService();
  const allUsers = await new UserService().getUsers();
  const approvedUsers = allUsers.filter((user) => user.is_approved);
  const users = await Promise.all(
    approvedUsers.map(async (user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      pushReady: await service.hasPushSubscription(user.id),
    })),
  );
  return NextResponse.json({
    configured: Boolean(OneSignalServerConfig.appId()),
    sendReady: OneSignalServerConfig.isSendReady(),
    currentUserId: profile.id,
    users,
  });
}

export async function POST(request: Request) {
  const profile = await new AuthorizationService().ensureRealAdminApi();
  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!OneSignalServerConfig.isSendReady()) {
    return NextResponse.json({ error: "ONESIGNAL_REST_API_KEY missing" }, { status: 503 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    let imageUrl: string | undefined;
    if (parsed.data.withTodolistImage !== false) {
      const dayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const sql = NeonDatabase.createClient();
      const profileRows = await sql<Array<{ name: string }>>`
        select name from profiles where id = ${parsed.data.userId} limit 1
      `;
      const planRows = await sql<
        Array<{ title: string; start_minute: number; is_done: boolean }>
      >`
        select t.title, udps.start_minute, udps.is_done
        from user_daily_plan_slots udps
        join tasks t on t.id = udps.task_id
        where udps.user_id = ${parsed.data.userId}
          and udps.plan_date = ${dayKey}::date
          and t.status <> 'completed'
        order by udps.is_done asc, udps.start_minute asc
        limit 8
      `;

      const sampleItems =
        planRows.length > 0
          ? planRows.map((row) => ({
              title: row.title,
              timeLabel: row.is_done
                ? `${formatPlanTime(row.start_minute)} · בוצע`
                : formatPlanTime(row.start_minute),
              kind: "task" as const,
              done: row.is_done,
            }))
          : [
              { title: "דוגמה: סגירת דוח", timeLabel: "09:00", kind: "task" as const },
              { title: "דוגמה: ישיבת צוות", timeLabel: "11:30", kind: "schedule" as const },
              { title: "דוגמה: מעקב משימות", timeLabel: "14:00", kind: "task" as const },
            ];

      imageUrl =
        (await new NotificationImageService().createTodolistImageUrl(
          parsed.data.userId,
          dayKey,
          {
            userName: profileRows[0]?.name ?? "משתמש",
            dayLabel: formatDayLabel(dayKey),
            items: sampleItems,
          },
        )) ?? undefined;
    }

    const result = await new OneSignalService().sendTestPush(parsed.data.userId, { imageUrl });
    return NextResponse.json({
      ok: true,
      imageAttached: Boolean(imageUrl),
      imageUrl: imageUrl ?? null,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    const status =
      message === "MISSING_REST_API_KEY" ? 503 : message === "USER_NOT_SUBSCRIBED" ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
