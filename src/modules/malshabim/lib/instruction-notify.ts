import { NeonDatabase } from "@/lib/db/neon";
import { NotificationService } from "@/services/notification.service";
import type { MalshabimCandidate, MalshabimInstructionItem } from "@/modules/malshabim/types";

function asItems(value: unknown): MalshabimInstructionItem[] {
  return Array.isArray(value) ? (value as MalshabimInstructionItem[]) : [];
}

function itemKey(item: MalshabimInstructionItem): string {
  return `${item.assignee_user_id ?? ""}::${(item.text ?? "").trim()}`;
}

export async function notifyNewInstructionAssignees(input: {
  candidate: MalshabimCandidate;
  previousItems?: unknown;
}): Promise<void> {
  if (input.candidate.is_draft) return;
  const next = asItems(input.candidate.instruction_items);
  const prevKeys = new Set(asItems(input.previousItems).map(itemKey));
  const fresh = next.filter((item) => {
    const text = (item.text ?? "").trim();
    const userId = item.assignee_user_id;
    if (!text || !userId) return false;
    return !prevKeys.has(itemKey(item));
  });
  if (fresh.length === 0) return;

  const db = NeonDatabase.createClient();
  const notify = new NotificationService();

  for (const item of fresh) {
    const userId = String(item.assignee_user_id);
    let email = typeof item.assignee_email === "string" ? item.assignee_email : null;
    let name = item.assignee_name ?? null;
    if (!email) {
      const rows = await db<Array<{ email: string | null; name: string | null }>>`
        select email, name from profiles where id = ${userId} limit 1
      `;
      email = rows[0]?.email ?? null;
      name = name || rows[0]?.name || null;
    }
    try {
      await notify.notifyMalshabimInstructionAssigned({
        candidateId: input.candidate.id,
        candidateName: input.candidate.full_name || "מועמד",
        instructionText: String(item.text ?? ""),
        assigneeUserId: userId,
        assigneeEmail: email,
        assigneeName: name,
      });
    } catch (error) {
      console.error("[instruction-notify]", input.candidate.id, userId, error);
    }
  }
}
