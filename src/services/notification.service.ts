import { TelegramService } from "@/services/telegram.service";
import { BaseService } from "@/services/base.service";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { AppUrls } from "@/lib/urls/app-urls";
import { formatScheduleTime } from "@/lib/dates/schedule-range";

interface TaskNotificationInput {
  taskId: string;
  title: string;
  subtopic: string;
  dueDate: string | null;
  assigneeIds: string[];
  creatorId?: string;
}

interface ScheduleNotificationInput {
  eventId: string;
  title: string;
  subtopic: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  participantIds: string[];
  creatorId?: string;
}

interface DailyDigestItem {
  id: string;
  title: string;
  subtopic: string | null;
  timeLabel: string;
  kind: "task" | "schedule";
}

interface DailyDigestInput {
  userId: string;
  userName: string;
  dayKey: string;
  items: DailyDigestItem[];
}

interface PendingUserInput {
  userId: string;
  name: string;
  email: string | null;
}

export class NotificationService extends BaseService {
  private telegram = new TelegramService();

  public async notifyTaskOpened(input: TaskNotificationInput): Promise<number> {
    if (!this.telegram.hasToken()) return 0;
    const recipientIds = await this.withAdminRecipients(input.assigneeIds);
    const text =
      "נפתחה משימה חדשה\n" +
      `משימה: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `תאריך גמר ביצוע: ${this.formatDate(input.dueDate)}` +
      this.taskLinkSuffix(input.taskId);
    return this.sendToUsers(recipientIds, text, (userId) => `task-opened:${input.taskId}:${userId}`);
  }

  public async notifyTaskDueTomorrow(input: TaskNotificationInput): Promise<number> {
    if (!this.telegram.hasToken()) return 0;
    const text =
      "תזכורת: משימה מסתיימת מחר\n" +
      `משימה: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `תאריך גמר ביצוע: ${this.formatDate(input.dueDate)}` +
      this.taskLinkSuffix(input.taskId);
    return this.sendToUsers(input.assigneeIds, text, (userId) => `task-due-tomorrow:${input.taskId}:${userId}`);
  }

  public async notifyScheduleCreated(input: ScheduleNotificationInput): Promise<number> {
    if (!this.telegram.hasToken()) return 0;
    const recipientIds = await this.withAdminRecipients(input.participantIds);
    const locationLine = input.location ? `\nמיקום: ${input.location}` : "";
    const text =
      "נקבע לו״ז חדש\n" +
      `כותרת: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `מועד: ${formatScheduleTime({ starts_at: input.startsAt, ends_at: input.endsAt, all_day: input.allDay })}${locationLine}` +
      this.scheduleLinkSuffix(input.eventId);
    return this.sendToUsers(recipientIds, text, (userId) => `schedule-created:${input.eventId}:${userId}`);
  }

  public async notifyDailyDigest(input: DailyDigestInput): Promise<number> {
    if (!this.telegram.hasToken() || input.items.length === 0) return 0;
    const lines = input.items.map((item, index) => {
      const subtopic = item.subtopic ? ` · ${toHebrewSubtopicLabel(item.subtopic)}` : "";
      const prefix = item.kind === "schedule" ? "לו״ז" : "משימה";
      const link =
        item.kind === "schedule"
          ? this.scheduleLinkSuffix(item.id)
          : this.taskLinkSuffix(item.id);
      return `${index + 1}. [${prefix}] ${item.title}${subtopic}\n   ${item.timeLabel}${link}`;
    });
    const text =
      `בוקר טוב ${input.userName}\n` +
      "הלו״ז שלך להיום:\n" +
      lines.join("\n");
    return this.sendToUsers([input.userId], text, (userId) => `daily-digest:${input.dayKey}:${userId}`);
  }

  public async notifyDailyTaskList(input: {
    userId: string;
    userName: string;
    dayKey: string;
    tasks: Array<{ id: string; title: string; dueDate: string | null; subtopic: string | null }>;
  }): Promise<number> {
    return this.notifyDailyDigest({
      userId: input.userId,
      userName: input.userName,
      dayKey: input.dayKey,
      items: input.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        subtopic: task.subtopic,
        timeLabel: this.formatDate(task.dueDate),
        kind: "task" as const,
      })),
    });
  }

  public async notifyPendingUser(input: PendingUserInput): Promise<number> {
    if (!this.telegram.hasToken()) return 0;
    const adminIds = await this.getAdminIds();
    const text =
      "משתמש חדש מחכה להרשאות\n" +
      `שם: ${input.name}\n` +
      `אימייל: ${input.email ?? "לא ידוע"}`;
    return this.sendToUsers(adminIds, text, (userId) => `pending-user:${input.userId}:${userId}`);
  }

  private async withAdminRecipients(userIds: string[]): Promise<string[]> {
    const adminIds = await this.getAdminIds();
    return [...new Set([...userIds, ...adminIds])];
  }

  private async getAdminIds(): Promise<string[]> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string }>>`
      select id from profiles
      where role = 'admin' and is_approved = true and telegram_id is not null
    `;
    return rows.map((row) => row.id);
  }

  private async sendToUsers(
    userIds: string[],
    text: string,
    keyForUser: (userId: string) => string,
  ): Promise<number> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    let sent = 0;
    for (const userId of uniqueIds) {
      const key = keyForUser(userId);
      if (!(await this.reserveDelivery(key))) continue;
      try {
        const delivered = await this.telegram.sendToUser(userId, text);
        if (delivered) sent += 1;
      } catch {
        continue;
      }
    }
    return sent;
  }

  private async reserveDelivery(key: string): Promise<boolean> {
    const db = this.getDb();
    try {
      const rows = await db<Array<{ id: string }>>`
        insert into notification_deliveries (notification_key)
        values (${key})
        on conflict (notification_key) do nothing
        returning id
      `;
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  private taskLinkSuffix(taskId: string): string {
    const url = AppUrls.taskDetail(taskId);
    if (!url) return "";
    return `\nקישור למשימה: ${url}`;
  }

  private scheduleLinkSuffix(eventId: string): string {
    const url = AppUrls.scheduleDetail(eventId);
    if (!url) return "";
    return `\nקישור ללו״ז: ${url}`;
  }

  private formatDate(value: string | null): string {
    if (!value) return "ללא תאריך";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ללא תאריך";
    return date.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }
}
