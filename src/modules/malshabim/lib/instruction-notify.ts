import { NeonDatabase } from "@/lib/db/neon";
import { NotificationService } from "@/services/notification.service";
import type {
  MalshabimCandidate,
  MalshabimInstructionAssignee,
  MalshabimInstructionItem,
} from "@/modules/malshabim/types";

function asItems(value: unknown): MalshabimInstructionItem[] {
  return Array.isArray(value) ? (value as MalshabimInstructionItem[]) : [];
}

function resolveAssignees(
  item: MalshabimInstructionItem,
): MalshabimInstructionAssignee[] {
  if (Array.isArray(item.assignees) && item.assignees.length > 0) {
    return item.assignees.filter(
      (assignee): assignee is MalshabimInstructionAssignee =>
        Boolean(assignee?.user_id),
    );
  }
  if (item.assignee_user_id) {
    return [
      {
        user_id: String(item.assignee_user_id),
        name: item.assignee_name ?? null,
        email: item.assignee_email ?? null,
      },
    ];
  }
  const legacy = Array.isArray(item.recipients) ? item.recipients[0] : null;
  if (legacy) {
    return [{ user_id: String(legacy), name: null, email: null }];
  }
  return [];
}

function itemKey(text: string, userId: string): string {
  return `${userId}::${text.trim()}`;
}

function collectKeys(items: MalshabimInstructionItem[]): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    const text = item.text ?? "";
    for (const assignee of resolveAssignees(item)) {
      keys.add(itemKey(text, assignee.user_id));
    }
  }
  return keys;
}

export async function notifyNewInstructionAssignees(input: {
  candidate: MalshabimCandidate;
  previousItems?: unknown;
}): Promise<void> {
  if (input.candidate.is_draft) return;
  const next = asItems(input.candidate.instruction_items);
  const prevKeys = collectKeys(asItems(input.previousItems));
  const fresh: Array<{
    text: string;
    assignee: MalshabimInstructionAssignee;
  }> = [];

  for (const item of next) {
    const text = (item.text ?? "").trim();
    if (!text) continue;
    for (const assignee of resolveAssignees(item)) {
      if (!prevKeys.has(itemKey(text, assignee.user_id))) {
        fresh.push({ text, assignee });
      }
    }
  }
  if (fresh.length === 0) return;

  const db = NeonDatabase.createClient();
  const notify = new NotificationService();

  for (const { text, assignee } of fresh) {
    const userId = String(assignee.user_id);
    let email = typeof assignee.email === "string" ? assignee.email : null;
    let name = assignee.name ?? null;
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
        instructionText: text,
        assigneeUserId: userId,
        assigneeEmail: email,
        assigneeName: name,
      });
    } catch (error) {
      console.error("[instruction-notify]", input.candidate.id, userId, error);
    }
  }
}
