import { TelegramService } from "@/services/telegram.service";
import { BaseService } from "@/services/base.service";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";

interface TaskNotificationInput {
  taskId: string;
  title: string;
  subtopic: string;
  dueDate: string | null;
  assigneeIds: string[];
  creatorId?: string;
}

interface UserTaskListInput {
  userId: string;
  userName: string;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    subtopic: string | null;
  }>;
  dayKey: string;
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
      `תאריך גמר ביצוע: ${this.formatDate(input.dueDate)}`;
    return this.sendToUsers(recipientIds, text, (userId) => `task-opened:${input.taskId}:${userId}`);
  }

  public async notifyTaskDueTomorrow(input: TaskNotificationInput): Promise<number> {
    if (!this.telegram.hasToken()) return 0;
    const text =
      "תזכורת: משימה מסתיימת מחר\n" +
      `משימה: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `תאריך גמר ביצוע: ${this.formatDate(input.dueDate)}`;
    return this.sendToUsers(input.assigneeIds, text, (userId) => `task-due-tomorrow:${input.taskId}:${userId}`);
  }

  public async notifyDailyTaskList(input: UserTaskListInput): Promise<number> {
    if (!this.telegram.hasToken() || input.tasks.length === 0) return 0;
    const lines = input.tasks.map((task, index) => {
      const subtopic = task.subtopic ? ` · ${toHebrewSubtopicLabel(task.subtopic)}` : "";
      return `${index + 1}. ${task.title}${subtopic}`;
    });
    const text =
      `בוקר טוב ${input.userName}\n` +
      "המשימות שלך להיום:\n" +
      lines.join("\n");
    return this.sendToUsers([input.userId], text, (userId) => `daily-task-list:${input.dayKey}:${userId}`);
  }

  // Test heartbeat: fires on every cron run to all linked users, no dedup or time window.
  public async sendCronHeartbeat(info: { dayKey: string; hour: number }): Promise<number> {
    if (!this.telegram.hasToken()) return 0;
    const text =
      "בדיקת קרון \u2705\n" +
      "התקבלה הפעלה מהקרון ג'וב\n" +
      `תאריך (ישראל): ${info.dayKey}\n` +
      `שעה (ישראל): ${String(info.hour).padStart(2, "0")}:00`;
    const result = await this.telegram.broadcastToLinkedUsers(text);
    return result.sent;
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

  private formatDate(value: string | null): string {
    if (!value) return "ללא תאריך";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ללא תאריך";
    return date.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }
}
