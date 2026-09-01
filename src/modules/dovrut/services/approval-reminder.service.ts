import { BaseService } from "@/services/base.service";
import { OneSignalService } from "@/services/onesignal.service";
import { AppUrls } from "@/lib/urls/app-urls";
import { APPROVAL_STATUS_LABELS } from "@/modules/dovrut/lib/approval-flows";
import type { DovrutApprovalStatus, DovrutConcept } from "@/modules/dovrut/types";

export class DovrutApprovalReminderService extends BaseService {
  private readonly push = new OneSignalService();

  public async sendPushReminders(
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
      `${pending.length} אייטמים ממתינים:`,
      lines,
      "",
      "לאישור: /dovrut/approvals",
    ].join("\n");

    const origin = AppUrls.getOrigin();
    const url = origin ? `${origin}/dovrut/approvals` : undefined;

    const stats = await this.push.sendDirectMessages(userIds, text, url);
    return { sent: stats.sent, pendingCount: pending.length };
  }

  /** @deprecated Use sendPushReminders */
  public async sendTelegramReminders(
    approvalStatus: Extract<
      DovrutApprovalStatus,
      "waiting_branch_head" | "waiting_deputy_commander" | "waiting_chief_rabbi"
    >,
    userIds: string[],
  ): Promise<{ sent: number; pendingCount: number }> {
    return this.sendPushReminders(approvalStatus, userIds);
  }
}
