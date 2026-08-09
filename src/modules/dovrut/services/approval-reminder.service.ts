import { BaseService } from "@/services/base.service";
import { TelegramService } from "@/services/telegram.service";
import { APPROVAL_STATUS_LABELS } from "@/modules/dovrut/lib/approval-flows";
import type { DovrutApprovalStatus, DovrutConcept } from "@/modules/dovrut/types";

export class DovrutApprovalReminderService extends BaseService {
  private readonly telegram = new TelegramService();

  // Sends Telegram reminders for items waiting at a given approval step.
  public async sendTelegramReminders(
    approvalStatus: Extract<
      DovrutApprovalStatus,
      "waiting_branch_head" | "waiting_deputy_commander" | "waiting_chief_rabbi"
    >,
    userIds: string[],
  ): Promise<{ sent: number; pendingCount: number }> {
    const db = this.getDb();
    const pending = await db<DovrutConcept[]>`
      select * from dovrut_concepts
      where approval_status = ${approvalStatus}
      order by updated_at desc
      limit 20
    `;
    if (pending.length === 0) {
      return { sent: 0, pendingCount: 0 };
    }
    const lines = pending
      .map(
        (item, index) =>
          `${index + 1}. ${item.name} — קוד: ${item.id}:${item.approval_status}`,
      )
      .join("\n");
    const text = [
      `תזכורת דוברות · ${APPROVAL_STATUS_LABELS[approvalStatus]}`,
      `${pending.length} פריטים ממתינים:`,
      lines,
      "",
      "לאישור: /dovrut/approvals",
    ].join("\n");

    let sent = 0;
    for (const userId of userIds) {
      try {
        const ok = await this.telegram.sendToUser(userId, text);
        if (ok) sent += 1;
      } catch {
        // continue other recipients
      }
    }
    return { sent, pendingCount: pending.length };
  }
}
