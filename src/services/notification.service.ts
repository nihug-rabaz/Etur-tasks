import { OneSignalService } from "@/services/onesignal.service";
import { BaseService } from "@/services/base.service";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { AppUrls } from "@/lib/urls/app-urls";
import { formatScheduleTime } from "@/lib/dates/schedule-range";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import type { NotificationImageService } from "@/services/notification-image.service";

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
  private push = new OneSignalService();
  private imagesPromise: Promise<NotificationImageService> | null = null;

  private async images(): Promise<NotificationImageService> {
    if (!this.imagesPromise) {
      this.imagesPromise = import("@/services/notification-image.service").then(
        (mod) => new mod.NotificationImageService(),
      );
    }
    return this.imagesPromise;
  }

  public async notifyTaskOpened(input: TaskNotificationInput): Promise<number> {
    if (!this.push.isReady()) return 0;
    const recipientIds = await this.withAdminRecipients(input.assigneeIds);
    const text =
      "נפתחה משימה חדשה\n" +
      `משימה: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `תאריך גמר ביצוע: ${this.formatDate(input.dueDate)}` +
      this.taskLinkSuffix(input.taskId);
    return this.sendToUsers(recipientIds, text, AppUrls.taskDetail(input.taskId), (userId) =>
      `task-opened:${input.taskId}:${userId}`,
    );
  }

  public async notifyTaskDueTomorrow(input: TaskNotificationInput): Promise<number> {
    if (!this.push.isReady()) return 0;
    const text =
      "תזכורת: משימה מסתיימת מחר\n" +
      `משימה: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `תאריך גמר ביצוע: ${this.formatDate(input.dueDate)}` +
      this.taskLinkSuffix(input.taskId);
    return this.sendToUsers(input.assigneeIds, text, AppUrls.taskDetail(input.taskId), (userId) =>
      `task-due-tomorrow:${input.taskId}:${userId}`,
    );
  }

  public async notifyScheduleCreated(input: ScheduleNotificationInput): Promise<number> {
    if (!this.push.isReady()) return 0;
    const recipientIds = await this.withAdminRecipients(input.participantIds);
    const locationLine = input.location ? `\nמיקום: ${input.location}` : "";
    const text =
      "נקבע לו״ז חדש\n" +
      `כותרת: ${input.title}\n` +
      `תת-נושא: ${toHebrewSubtopicLabel(input.subtopic)}\n` +
      `מועד: ${formatScheduleTime({ starts_at: input.startsAt, ends_at: input.endsAt, all_day: input.allDay })}${locationLine}` +
      this.scheduleLinkSuffix(input.eventId);
    return this.sendToUsers(recipientIds, text, AppUrls.scheduleDetail(input.eventId), (userId) =>
      `schedule-created:${input.eventId}:${userId}`,
    );
  }

  public async notifyDailyDigest(input: DailyDigestInput): Promise<number> {
    if (!this.push.isReady()) return 0;
    const summaryLines =
      input.items.length === 0
        ? ["אין משימות או לו״ז להיום."]
        : [
            `${input.items.length} פריטים להיום — פתחו את ההתראה לצפייה ברשימה.`,
            ...input.items.slice(0, 3).map((item, index) => {
              const subtopic = item.subtopic ? ` · ${toHebrewSubtopicLabel(item.subtopic)}` : "";
              const prefix = item.kind === "schedule" ? "לו״ז" : "משימה";
              return `${index + 1}. [${prefix}] ${item.title}${subtopic}`;
            }),
          ];
    const text =
      `בוקר טוב ${input.userName}\n` +
      "הלו״ז שלך להיום:\n" +
      summaryLines.join("\n");

    const imageUrl = await (await this.images()).createTodolistImageUrl(input.userId, input.dayKey, {
      userName: input.userName,
      dayLabel: this.formatDayLabel(input.dayKey),
      items: input.items.map((item) => ({
        title: item.title,
        timeLabel: item.timeLabel,
        kind: item.kind,
        done: item.timeLabel.includes("בוצע"),
      })),
    });

    return this.sendToUsers(
      [input.userId],
      text,
      AppUrls.getOrigin() || undefined,
      (userId) => `daily-digest:${input.dayKey}:${userId}`,
      imageUrl ?? undefined,
    );
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
    if (!this.push.isReady()) return 0;
    const adminIds = await this.getAdminIds();
    const text =
      "משתמש חדש מחכה להרשאות\n" +
      `שם: ${input.name}\n` +
      `אימייל: ${input.email ?? "לא ידוע"}`;
    return this.sendToUsers(adminIds, text, undefined, (userId) => `pending-user:${input.userId}:${userId}`);
  }

  public async notifyTaskCloseRequested(input: {
    taskId: string;
    title: string;
    requesterName: string;
    note: string | null;
  }): Promise<number> {
    if (!this.push.isReady()) return 0;
    const adminIds = await this.getAdminIds();
    const noteLine = input.note ? `\nהערה: ${input.note}` : "";
    const text =
      "בקשה לסגירת משימה\n" +
      `משימה: ${input.title}\n` +
      `מבקש: ${input.requesterName}${noteLine}` +
      this.taskLinkSuffix(input.taskId);
    return this.sendToUsers(
      adminIds,
      text,
      AppUrls.taskDetail(input.taskId),
      (userId) => `task-close-requested:${input.taskId}:${userId}:${Date.now()}`,
    );
  }

  public async notifyTaskCloseDecision(input: {
    taskId: string;
    title: string;
    requesterId: string;
    approved: boolean;
    reviewNote?: string | null;
  }): Promise<number> {
    if (!this.push.isReady()) return 0;
    const noteLine = input.reviewNote ? `\nהערת מנהל: ${input.reviewNote}` : "";
    const text = input.approved
      ? `בקשת הסגירה אושרה\nמשימה: ${input.title}${this.taskLinkSuffix(input.taskId)}`
      : `בקשת הסגירה נדחתה\nמשימה: ${input.title}${noteLine}${this.taskLinkSuffix(input.taskId)}`;
    return this.sendToUsers(
      [input.requesterId],
      text,
      AppUrls.taskDetail(input.taskId),
      (userId) =>
        `task-close-decision:${input.taskId}:${input.approved ? "ok" : "no"}:${userId}:${Date.now()}`,
    );
  }

  public async notifyMalshabimApprovalRequested(input: {
    candidateId: string;
    fullName: string;
    requesterName: string;
  }): Promise<number> {
    if (!this.push.isReady()) return 0;
    const adminIds = await this.getMalshabimAdminIds();
    const url = this.malshabimCandidateUrl(input.candidateId);
    const text =
      "בקשה לאישור מלש״ב\n" +
      `מועמד: ${input.fullName}\n` +
      `מבקש: ${input.requesterName}` +
      (url ? `\nקישור לתיק: ${url}` : "");
    return this.sendToUsers(
      adminIds,
      text,
      url || undefined,
      (userId) =>
        `malshabim-approval-requested:${input.candidateId}:${userId}:${Date.now()}`,
    );
  }

  public async notifyMalshabimInterviewReminder(input: {
    candidateId: string;
    fullName: string;
    interviewAt: string;
    interviewerUserId: string;
  }): Promise<number> {
    if (!this.push.isReady()) return 0;
    const url = this.malshabimCandidateUrl(input.candidateId);
    const text =
      "תזכורת: ריאיון מלש״ב בעוד כשעה\n" +
      `מועמד: ${input.fullName}\n` +
      `מועד: ${this.formatDate(input.interviewAt)}` +
      (url ? `\nקישור לתיק: ${url}` : "");
    return this.sendToUsers(
      [input.interviewerUserId],
      text,
      url || undefined,
      (userId) => `malshabim-interview-reminder:${input.candidateId}:${userId}`,
    );
  }

  /** Daily 10:00 Israel digest of מחכים לראיון for malshabim module users. */
  public async notifyMalshabimWaitlistMorningDigest(input: {
    dayKey: string;
    entries: Array<{ full_name: string; phone: string }>;
  }): Promise<number> {
    if (!this.push.isReady()) return 0;
    if (input.entries.length === 0) return 0;

    const recipientIds = await this.getMalshabimRecipientIds();
    if (recipientIds.length === 0) return 0;

    const maxNames = 12;
    const nameLines = input.entries.slice(0, maxNames).map((entry, index) => {
      const phone = entry.phone?.trim() ? ` · ${entry.phone.trim()}` : "";
      return `${index + 1}. ${entry.full_name || "ללא שם"}${phone}`;
    });
    const remaining = input.entries.length - nameLines.length;
    const moreLine =
      remaining > 0 ? `\n…ועוד ${remaining} ממתינים` : "";
    const url = this.malshabimWaitlistUrl();
    const text =
      "היי — רשימת מחכים לראיון להיום\n" +
      `סה״כ ממתינים: ${input.entries.length}\n` +
      nameLines.join("\n") +
      moreLine +
      (url ? `\nלפתיחת הרשימה: ${url}` : "");

    return this.sendToUsers(
      recipientIds,
      text,
      url || undefined,
      (userId) => `malshabim-waitlist-morning:${input.dayKey}:${userId}`,
    );
  }

  private async getMalshabimAdminIds(): Promise<string[]> {
    const users = await new ModuleRoleService().listModuleUsers("malshabim");
    return users.filter((user) => user.role === "admin").map((user) => user.user_id);
  }

  private async getMalshabimRecipientIds(): Promise<string[]> {
    const users = await new ModuleRoleService().listModuleUsers("malshabim");
    return [...new Set(users.map((user) => user.user_id).filter(Boolean))];
  }

  private malshabimCandidateUrl(candidateId: string): string {
    const origin = AppUrls.getOrigin();
    const path = `/malshabim/candidates/${candidateId}`;
    return origin ? `${origin}${path}` : path;
  }

  private malshabimWaitlistUrl(): string {
    const origin = AppUrls.getOrigin();
    const path = "/malshabim/waitlist";
    return origin ? `${origin}${path}` : path;
  }

  private async withAdminRecipients(userIds: string[]): Promise<string[]> {
    const adminIds = await this.getAdminIds();
    return [...new Set([...userIds, ...adminIds])];
  }

  private async getAdminIds(): Promise<string[]> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string }>>`
      select id from profiles
      where role = 'admin' and is_approved = true
    `;
    return rows.map((row) => row.id);
  }

  private async sendToUsers(
    userIds: string[],
    text: string,
    url: string | undefined,
    keyForUser: (userId: string) => string,
    imageUrl?: string,
  ): Promise<number> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    let sent = 0;
    for (const userId of uniqueIds) {
      const key = keyForUser(userId);
      if (!(await this.reserveDelivery(key))) continue;
      try {
        const delivered = await this.push.sendTextToUser(userId, text, url, imageUrl);
        if (delivered) {
          sent += 1;
        } else {
          await this.releaseDelivery(key);
        }
      } catch (error) {
        await this.releaseDelivery(key);
        console.error("[notification-send]", key, error);
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

  private async releaseDelivery(key: string): Promise<void> {
    const db = this.getDb();
    try {
      await db`delete from notification_deliveries where notification_key = ${key}`;
    } catch (error) {
      console.error("[notification-release]", key, error);
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

  private formatDayLabel(dayKey: string): string {
    const date = new Date(`${dayKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dayKey;
    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  private formatDate(value: string | null): string {
    if (!value) return "ללא תאריך";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "ללא תאריך";
    return date.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }
}
